import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { AnalysisResult } from "./gemini.js";

// 資料目錄可用 DATA_DIR 指定（例如 Render persistent disk 的掛載路徑）
export const DATA_DIR = process.env.DATA_DIR || path.resolve("data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// 本機伺服器與同步程式會同時寫入，遇到鎖住時等待而不是直接失敗
const db = new DatabaseSync(path.join(DATA_DIR, "analyses.db"), { timeout: 10000 });

db.exec(`
  CREATE TABLE IF NOT EXISTS analyses (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    image_file TEXT NOT NULL,
    status TEXT NOT NULL,
    error TEXT,
    pectoralis_score INTEGER,
    nipple_score INTEGER,
    tissue_completeness_score INTEGER,
    tissue_elasticity_score INTEGER,
    radiation_dose_score INTEGER,
    grade TEXT,
    defects TEXT,
    analysis TEXT,
    analysis_time INTEGER,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_analyses_batch ON analyses(batch_id);
  CREATE INDEX IF NOT EXISTS idx_analyses_created ON analyses(created_at);
`);

// 舊資料庫補上資料夾分類欄位（醫院／病人）
const existingCols = new Set(
  (db.prepare(`PRAGMA table_info(analyses)`).all() as { name: string }[]).map((c) => c.name)
);
for (const col of ["folder_path", "hospital", "patient"]) {
  if (!existingCols.has(col)) db.exec(`ALTER TABLE analyses ADD COLUMN ${col} TEXT`);
}
db.exec(`CREATE INDEX IF NOT EXISTS idx_analyses_folder ON analyses(hospital, patient)`);

// 上傳時的相對路徑如「馬偕/001-020/001/影像.jpg」：
// 最外層（使用者選的那個資料夾）是醫院，影像所在的資料夾是病人，中間的分組層略過
export function parseFolder(relativePath: string | undefined): {
  folderPath: string | null;
  hospital: string | null;
  patient: string | null;
} {
  const dirs = (relativePath ?? "").split(/[\\/]/).filter(Boolean).slice(0, -1);
  if (dirs.length === 0) return { folderPath: null, hospital: null, patient: null };
  return {
    folderPath: dirs.join("/"),
    patient: dirs[dirs.length - 1],
    hospital: dirs.length >= 2 ? dirs[0] : null,
  };
}

export const NO_FOLDER = "__none__";

// 沒有資料夾資訊時，依各醫院匯出影像的命名方式推斷醫院與病人
const HOSPITAL_BY_NAMING = {
  ntu: "台大",
  copy: "未知醫院 A（30 (n) 命名）",
  dash: "未知醫院 B（1-1 命名）",
  sieve: "未知醫院 C（Mammography 命名）",
};
// 3791523_20230620_MG_2_4_4.jpg：七位數病歷號開頭
const NTU = /^(\d{7})_\d{8}_MG_/;
// 7-3.jpg：病人序號-影像序號
const DASH = /^(\d+)-[1-4]\.\w+$/;
// 30.jpg ~ 33.jpg、1230.jpg ~ 1233.jpg：同一位病人四張號碼連續
const PLAIN = /^(\d+)\.\w+$/;
// 30 (15).jpg：括號是複製時的流水號，每 4 號是同一位病人
const COPY = /^\d+ \((\d+)\)\.\w+$/;
// Mammography(Sieve-3F).R CC.Se 71100000.Img 58-1.jpg：同一位病人四個視角的 Img 號碼相連
const SIEVE = /^Mammography(?:\(([^)]*)\))?\.([RL] (?:CC|MLO))\.Se (\d+)\.Img (\d+)-\d+\.\w+$/;
// Mammography(Sieve-3F).Mammography(Sieve-2).Se 68393.Img 1-4.jpg：同一個 Se 是同一位病人
const SIEVE_SERIES = /^Mammography\([^)]*\)\.Mammography\([^)]*\)\.Se (\d+)\.Img \d+-\d+\.\w+$/;

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

function guessFromFileNames(rows: { id: string; file_name: string }[]) {
  const guess = new Map<string, { hospital: string; patient: string }>();
  const plain = new Map<number, { id: string; n: number }[]>();
  const sieve: { id: string; name: string; series: string; view: string; se: number; img: number }[] = [];
  for (const { id, file_name: name } of rows) {
    let m: RegExpExecArray | null;
    if ((m = NTU.exec(name))) guess.set(id, { hospital: HOSPITAL_BY_NAMING.ntu, patient: m[1] });
    else if ((m = DASH.exec(name))) guess.set(id, { hospital: HOSPITAL_BY_NAMING.dash, patient: pad(+m[1]) });
    else if ((m = COPY.exec(name))) {
      const first = Math.floor((+m[1] - 1) / 4) * 4 + 1;
      guess.set(id, { hospital: HOSPITAL_BY_NAMING.copy, patient: `(${pad(first)})-(${pad(first + 3)})` });
    } else if ((m = PLAIN.exec(name))) {
      const n = +m[1];
      const key = Math.floor(n / 10);
      plain.set(key, [...(plain.get(key) ?? []), { id, n }]);
    } else if ((m = SIEVE_SERIES.exec(name))) guess.set(id, { hospital: HOSPITAL_BY_NAMING.sieve, patient: `Se ${m[1]}` });
    else if ((m = SIEVE.exec(name))) sieve.push({ id, name, series: m[1] ?? "", view: m[2], se: +m[3], img: +m[4] });
  }

  for (const members of Array.from(plain.values())) {
    const ns = members.map((x) => x.n);
    const patient = `${Math.min(...ns)}-${Math.max(...ns)}`;
    for (const x of members) guess.set(x.id, { hospital: HOSPITAL_BY_NAMING.copy, patient });
  }

  // 完全同名的檔案分不出是哪位病人，放在一起
  const nameCount = new Map<string, number>();
  for (const s of sieve) nameCount.set(s.name, (nameCount.get(s.name) ?? 0) + 1);
  const label = (series: string, text: string) => (series ? `${series.replace("Sieve-", "")} ${text}` : text);
  for (const s of sieve.filter((x) => nameCount.get(x.name)! > 1)) {
    guess.set(s.id, { hospital: HOSPITAL_BY_NAMING.sieve, patient: label(s.series, `Img ${s.img}（同名無法區分）`) });
  }

  // 其餘依 Se、Img 排序，同一個視角再次出現就換下一位病人
  const bySeries = new Map<string, typeof sieve>();
  for (const s of sieve.filter((x) => nameCount.get(x.name) === 1)) {
    bySeries.set(s.series, [...(bySeries.get(s.series) ?? []), s]);
  }
  for (const [series, list] of Array.from(bySeries)) {
    list.sort((a, b) => a.se - b.se || a.img - b.img);
    const groups: (typeof sieve)[] = [];
    for (const s of list) {
      const cur = groups[groups.length - 1];
      if (!cur || cur.some((x) => x.view === s.view)) groups.push([s]);
      else cur.push(s);
    }
    for (const g of groups) {
      const sameSe = g.every((x) => x.se === g[0].se);
      const nums = g.map((x) => (sameSe ? x.img : x.se));
      const text = `${sameSe ? "Img" : "Se"} ${pad(Math.min(...nums), 3)}-${pad(Math.max(...nums), 3)}`;
      for (const s of g) guess.set(s.id, { hospital: HOSPITAL_BY_NAMING.sieve, patient: label(series, text) });
    }
  }
  return guess;
}

export type AnalysisStatus = "ok" | "parse_failed" | "error";

export interface AnalysisRecord {
  id: string;
  batchId: string;
  fileName: string;
  mimeType: string;
  status: AnalysisStatus;
  error: string | null;
  pectoralisScore: number | null;
  nippleScore: number | null;
  tissueCompletenessScore: number | null;
  tissueElasticityScore: number | null;
  radiationDoseScore: number | null;
  grade: "A" | "B" | "C" | "D" | null;
  defects: string[];
  analysis: string | null;
  analysisTime: number | null;
  createdAt: string;
  folderPath: string | null;
  hospital: string | null;
  patient: string | null;
}

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

export function saveImage(data: Buffer, mimeType: string): { id: string; imageFile: string } {
  const id = randomUUID();
  const imageFile = `${id}.${EXT[mimeType] ?? "bin"}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, imageFile), data);
  return { id, imageFile };
}

export function insertAnalysis(row: {
  id: string;
  batchId: string;
  fileName: string;
  mimeType: string;
  imageFile: string;
  relativePath?: string;
  status: AnalysisStatus;
  error?: string;
  result?: AnalysisResult;
}) {
  const r = row.result;
  const folder = parseFolder(row.relativePath);
  db.prepare(
    `INSERT INTO analyses (
      id, batch_id, file_name, mime_type, image_file, status, error,
      pectoralis_score, nipple_score, tissue_completeness_score,
      tissue_elasticity_score, radiation_dose_score, grade, defects,
      analysis, analysis_time, created_at, folder_path, hospital, patient
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.id,
    row.batchId,
    row.fileName,
    row.mimeType,
    row.imageFile,
    row.status,
    row.error ?? null,
    r?.pectoralisScore ?? null,
    r?.nippleScore ?? null,
    r?.tissueCompletenessScore ?? null,
    r?.tissueElasticityScore ?? null,
    r?.radiationDoseScore ?? null,
    r?.grade ?? null,
    JSON.stringify(r?.defects ?? []),
    r?.analysis ?? null,
    r?.analysisTime ?? null,
    new Date().toISOString(),
    folder.folderPath,
    folder.hospital,
    folder.patient
  );
  if (!folder.folderPath) classifyUnfiled();
}

export function hasAnalysis(id: string): boolean {
  return !!db.prepare(`SELECT 1 FROM analyses WHERE id = ?`).get(id);
}

// 從遠端（Render）同步回來的紀錄，保留原本的 id 與建立時間
export function importAnalysis(rec: AnalysisRecord, image: Buffer) {
  const imageFile = `${rec.id}.${EXT[rec.mimeType] ?? "bin"}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, imageFile), image);
  db.prepare(
    `INSERT OR IGNORE INTO analyses (
      id, batch_id, file_name, mime_type, image_file, status, error,
      pectoralis_score, nipple_score, tissue_completeness_score,
      tissue_elasticity_score, radiation_dose_score, grade, defects,
      analysis, analysis_time, created_at, folder_path, hospital, patient
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    rec.id,
    rec.batchId,
    rec.fileName,
    rec.mimeType,
    imageFile,
    rec.status,
    rec.error,
    rec.pectoralisScore,
    rec.nippleScore,
    rec.tissueCompletenessScore,
    rec.tissueElasticityScore,
    rec.radiationDoseScore,
    rec.grade,
    JSON.stringify(rec.defects),
    rec.analysis,
    rec.analysisTime,
    rec.createdAt,
    rec.folderPath ?? null,
    // 以本機規則從資料夾路徑重新推算，不依賴雲端版本的判斷
    rec.folderPath ? parseFolder(`${rec.folderPath}/x`).hospital : null,
    rec.folderPath ? parseFolder(`${rec.folderPath}/x`).patient : null
  );
  if (!rec.folderPath) classifyUnfiled();
}

function toRecord(row: Record<string, unknown>): AnalysisRecord {
  return {
    id: row.id as string,
    batchId: row.batch_id as string,
    fileName: row.file_name as string,
    mimeType: row.mime_type as string,
    status: row.status as AnalysisStatus,
    error: row.error as string | null,
    pectoralisScore: row.pectoralis_score as number | null,
    nippleScore: row.nipple_score as number | null,
    tissueCompletenessScore: row.tissue_completeness_score as number | null,
    tissueElasticityScore: row.tissue_elasticity_score as number | null,
    radiationDoseScore: row.radiation_dose_score as number | null,
    grade: row.grade as AnalysisRecord["grade"],
    defects: JSON.parse((row.defects as string) || "[]"),
    analysis: row.analysis as string | null,
    analysisTime: row.analysis_time as number | null,
    createdAt: row.created_at as string,
    folderPath: row.folder_path as string | null,
    hospital: row.hospital as string | null,
    patient: row.patient as string | null,
  };
}

export function listAnalyses(opts: {
  batchId?: string;
  grade?: string;
  status?: string;
  hospital?: string;
  patient?: string;
  limit: number;
  offset: number;
}): { items: AnalysisRecord[]; total: number } {
  const where: string[] = [];
  const params: string[] = [];
  if (opts.batchId) {
    where.push("batch_id = ?");
    params.push(opts.batchId);
  }
  if (opts.grade) {
    where.push("grade = ?");
    params.push(opts.grade);
  }
  if (opts.status) {
    where.push("status = ?");
    params.push(opts.status);
  }
  // NO_FOLDER 代表沒有資料夾資訊（單張上傳）的紀錄
  for (const [col, value] of [["hospital", opts.hospital], ["patient", opts.patient]] as const) {
    if (value === NO_FOLDER) where.push(`${col} IS NULL`);
    else if (value) {
      where.push(`${col} = ?`);
      params.push(value);
    }
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = (
    db.prepare(`SELECT COUNT(*) AS n FROM analyses ${clause}`).get(...params) as { n: number }
  ).n;
  const rows = db
    .prepare(`SELECT * FROM analyses ${clause} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, opts.limit, opts.offset) as Record<string, unknown>[];
  return { items: rows.map(toRecord), total };
}

export function listBatches() {
  return db
    .prepare(
      `SELECT batch_id AS batchId, COUNT(*) AS count, MIN(created_at) AS startedAt,
        SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END) AS okCount
       FROM analyses GROUP BY batch_id ORDER BY startedAt DESC`
    )
    .all() as { batchId: string; count: number; startedAt: string; okCount: number }[];
}

// 補登資料夾分類：只更新還沒有分類的紀錄
export function listUnfiled(): { id: string; fileName: string }[] {
  return db
    .prepare(`SELECT id, file_name AS fileName FROM analyses WHERE folder_path IS NULL`)
    .all() as { id: string; fileName: string }[];
}

export function setFolder(id: string, relativePath: string) {
  const f = parseFolder(relativePath);
  db.prepare(`UPDATE analyses SET folder_path = ?, hospital = ?, patient = ? WHERE id = ?`).run(
    f.folderPath,
    f.hospital,
    f.patient,
    id
  );
}

// 後台左側的醫院／病人目錄
export function listFolders() {
  return db
    .prepare(
      `SELECT hospital, patient, COUNT(*) AS count,
        SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END) AS okCount
       FROM analyses GROUP BY hospital, patient ORDER BY hospital, patient`
    )
    .all() as { hospital: string | null; patient: string | null; count: number; okCount: number }[];
}

export function getImageFile(id: string): { path: string; mimeType: string } | null {
  const row = db.prepare(`SELECT image_file, mime_type FROM analyses WHERE id = ?`).get(id) as
    | { image_file: string; mime_type: string }
    | undefined;
  if (!row) return null;
  return { path: path.join(UPLOAD_DIR, row.image_file), mimeType: row.mime_type };
}

// 啟動時依目前的規則重新整理已有資料夾路徑的紀錄
{
  const rows = db
    .prepare(`SELECT id, folder_path FROM analyses WHERE folder_path IS NOT NULL`)
    .all() as { id: string; folder_path: string }[];
  const update = db.prepare(`UPDATE analyses SET hospital = ?, patient = ? WHERE id = ?`);
  for (const row of rows) {
    const f = parseFolder(`${row.folder_path}/x`);
    update.run(f.hospital, f.patient, row.id);
  }
}

// 沒有資料夾資訊的紀錄，依檔名命名方式重新分類（同一位病人的影像可能分在不同批上傳）
export function classifyUnfiled() {
  const rows = db
    .prepare(`SELECT id, file_name FROM analyses WHERE folder_path IS NULL`)
    .all() as { id: string; file_name: string }[];
  const update = db.prepare(`UPDATE analyses SET hospital = ?, patient = ? WHERE id = ?`);
  for (const [id, g] of Array.from(guessFromFileNames(rows))) update.run(g.hospital, g.patient, id);
}
classifyUnfiled();
