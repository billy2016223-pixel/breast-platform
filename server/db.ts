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
  status: AnalysisStatus;
  error?: string;
  result?: AnalysisResult;
}) {
  const r = row.result;
  db.prepare(
    `INSERT INTO analyses (
      id, batch_id, file_name, mime_type, image_file, status, error,
      pectoralis_score, nipple_score, tissue_completeness_score,
      tissue_elasticity_score, radiation_dose_score, grade, defects,
      analysis, analysis_time, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
    new Date().toISOString()
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
  };
}

export function listAnalyses(opts: {
  batchId?: string;
  grade?: string;
  status?: string;
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

export function getImageFile(id: string): { path: string; mimeType: string } | null {
  const row = db.prepare(`SELECT image_file, mime_type FROM analyses WHERE id = ?`).get(id) as
    | { image_file: string; mime_type: string }
    | undefined;
  if (!row) return null;
  return { path: path.join(UPLOAD_DIR, row.image_file), mimeType: row.mime_type };
}
