import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), ".data");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  ensureDataDir();
  const dbPath = path.join(DATA_DIR, "training.db");
  _db = new Database(dbPath);

  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  _db.exec(`
    CREATE TABLE IF NOT EXISTS training_sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      topics TEXT NOT NULL,       -- JSON array of topic strings
      modules TEXT NOT NULL,      -- JSON array of TrainingModule objects
      source TEXT NOT NULL DEFAULT 'manual',  -- 'image' | 'manual'
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS questionnaires (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      title TEXT NOT NULL,
      modules TEXT NOT NULL,      -- JSON array of {topic, questions}
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS questionnaire_responses (
      id TEXT PRIMARY KEY,
      questionnaire_id TEXT NOT NULL,
      employee_email TEXT NOT NULL,
      answers TEXT NOT NULL,      -- JSON object
      score INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (questionnaire_id) REFERENCES questionnaires(id) ON DELETE CASCADE
    );
  `);

  return _db;
}

export function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}
