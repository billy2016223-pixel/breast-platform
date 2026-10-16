import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { AnalysisResult } from "./gemini.js";

// 資料目錄可用 DATA_DIR 指定（例如 Render persistent disk 的掛載路徑）
export const DATA_DIR = process.env.DATA_DIR || path.resolve("data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, "analyses.db"));

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

// 上傳時的相對路徑如「醫院/病人/影像.jpg」，取最後兩層資料夾作為醫院與病人
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
    hospital: dirs.length >= 2 ? dirs[dirs.length - 2] : null,
  };
}

export const NO_FOLDER = "__none__";

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
    rec.hospital ?? null,
    rec.patient ?? null
  );
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
