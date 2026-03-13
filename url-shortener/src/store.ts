import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import type { Config } from "./config.js";
import { generateShortCode } from "./encoder.js";
import { LRUCache } from "./cache.js";

export interface UrlRecord {
  id: number;
  short_code: string;
  original_url: string;
  created_at: string;
  click_count: number;
}

export class UrlStore {
  private db: Database.Database;
  private cache: LRUCache;
  private shortCodeLength: number;

  private stmtInsert!: Database.Statement;
  private stmtFindByCode!: Database.Statement;
  private stmtFindByUrl!: Database.Statement;
  private stmtIncrementClicks!: Database.Statement;
  private stmtUpdateCode!: Database.Statement;
  private stmtGetStats!: Database.Statement;

  constructor(config: Config) {
    const dbDir = path.dirname(config.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(config.dbPath);
    this.cache = new LRUCache(config.cacheMaxSize, config.cacheTtlMs);
    this.shortCodeLength = config.shortCodeLength;

    this.initialize();
    this.prepareStatements();
  }

  private initialize(): void {
    // WAL mode: concurrent readers don't block writers and vice versa.
    // This is critical for production — redirects (reads) never stall
    // behind URL creation (writes).
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = NORMAL");
    this.db.pragma("cache_size = -64000"); // 64MB page cache
    this.db.pragma("busy_timeout = 5000");

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS urls (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        short_code  TEXT    UNIQUE NOT NULL,
        original_url TEXT   NOT NULL,
        created_at  TEXT    DEFAULT (datetime('now')),
        click_count INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_urls_short_code ON urls(short_code);
      CREATE INDEX IF NOT EXISTS idx_urls_original_url ON urls(original_url);
    `);
  }

  private prepareStatements(): void {
    this.stmtInsert = this.db.prepare(
      "INSERT INTO urls (short_code, original_url) VALUES (?, ?)"
    );
    this.stmtFindByCode = this.db.prepare(
      "SELECT * FROM urls WHERE short_code = ?"
    );
    this.stmtFindByUrl = this.db.prepare(
      "SELECT * FROM urls WHERE original_url = ?"
    );
    this.stmtIncrementClicks = this.db.prepare(
      "UPDATE urls SET click_count = click_count + 1 WHERE short_code = ?"
    );
    this.stmtUpdateCode = this.db.prepare(
      "UPDATE urls SET short_code = ? WHERE id = ?"
    );
    this.stmtGetStats = this.db.prepare(
      "SELECT COUNT(*) as total_urls, SUM(click_count) as total_clicks FROM urls"
    );
  }

  /**
   * Create a shortened URL. If the URL already exists, return the existing record.
   * Uses a transaction: insert row → generate Base62 code from ID → update code.
   */
  shorten(originalUrl: string): UrlRecord {
    const existing = this.stmtFindByUrl.get(originalUrl) as
      | UrlRecord
      | undefined;
    if (existing) return existing;

    const createUrl = this.db.transaction(() => {
      const tempCode = `_tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const result = this.stmtInsert.run(tempCode, originalUrl);
      const id = Number(result.lastInsertRowid);

      const shortCode = generateShortCode(id, this.shortCodeLength);
      this.stmtUpdateCode.run(shortCode, id);

      return this.stmtFindByCode.get(shortCode) as UrlRecord;
    });

    const record = createUrl();
    this.cache.set(record.short_code, record.original_url);
    return record;
  }

  /**
   * Resolve a short code to the original URL.
   * Cache-first: returns from memory if available, falls back to DB.
   */
  resolve(shortCode: string): string | undefined {
    const cached = this.cache.get(shortCode);
    if (cached) return cached;

    const record = this.stmtFindByCode.get(shortCode) as
      | UrlRecord
      | undefined;
    if (!record) return undefined;

    this.cache.set(shortCode, record.original_url);
    return record.original_url;
  }

  /**
   * Increment click count asynchronously — fire and forget.
   * Click tracking should never add latency to the redirect path.
   */
  recordClick(shortCode: string): void {
    try {
      this.stmtIncrementClicks.run(shortCode);
    } catch {
      // Non-critical: don't let analytics failures affect redirects
    }
  }

  getUrlInfo(shortCode: string): UrlRecord | undefined {
    return this.stmtFindByCode.get(shortCode) as UrlRecord | undefined;
  }

  getStats(): { total_urls: number; total_clicks: number } {
    return this.stmtGetStats.get() as {
      total_urls: number;
      total_clicks: number;
    };
  }

  get cacheStats() {
    return this.cache.stats;
  }

  close(): void {
    this.cache.clear();
    this.db.close();
  }
}
