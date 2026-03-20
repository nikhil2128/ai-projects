import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db.js";

export interface TrainingSessionRow {
  id: string;
  title: string;
  topics: string;
  modules: string;
  source: string;
  created_at: string;
}

export interface TrainingSession {
  id: string;
  title: string;
  topics: string[];
  modules: unknown[];
  source: "image" | "manual";
  createdAt: string;
}

export interface TrainingSessionSummary {
  id: string;
  title: string;
  topics: string[];
  topicCount: number;
  source: "image" | "manual";
  createdAt: string;
}

function rowToSession(row: TrainingSessionRow): TrainingSession {
  return {
    id: row.id,
    title: row.title,
    topics: JSON.parse(row.topics),
    modules: JSON.parse(row.modules),
    source: row.source as "image" | "manual",
    createdAt: row.created_at,
  };
}

function rowToSummary(row: TrainingSessionRow): TrainingSessionSummary {
  const topics = JSON.parse(row.topics) as string[];
  return {
    id: row.id,
    title: row.title,
    topics,
    topicCount: topics.length,
    source: row.source as "image" | "manual",
    createdAt: row.created_at,
  };
}

export function createSession(
  topics: string[],
  modules: unknown[],
  source: "image" | "manual" = "manual"
): TrainingSession {
  const db = getDb();
  const id = uuidv4();
  const title = topics.join(", ");

  db.prepare(
    `INSERT INTO training_sessions (id, title, topics, modules, source) VALUES (?, ?, ?, ?, ?)`
  ).run(id, title, JSON.stringify(topics), JSON.stringify(modules), source);

  const row = db
    .prepare(`SELECT * FROM training_sessions WHERE id = ?`)
    .get(id) as TrainingSessionRow;

  return rowToSession(row);
}

export function getSession(id: string): TrainingSession | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM training_sessions WHERE id = ?`)
    .get(id) as TrainingSessionRow | undefined;

  return row ? rowToSession(row) : null;
}

export function listSessions(): TrainingSessionSummary[] {
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM training_sessions ORDER BY created_at DESC`)
    .all() as TrainingSessionRow[];

  return rows.map(rowToSummary);
}

export function deleteSession(id: string): boolean {
  const db = getDb();
  const result = db
    .prepare(`DELETE FROM training_sessions WHERE id = ?`)
    .run(id);

  return result.changes > 0;
}
