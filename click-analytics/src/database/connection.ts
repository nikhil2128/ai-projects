import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { config } from "../config";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dir = path.dirname(config.dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(config.dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");

  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
