import { getDb } from "./connection";

export function initializeSchema(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS click_events (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id    TEXT    NOT NULL,
      page_url      TEXT    NOT NULL,
      element_tag   TEXT    NOT NULL,
      element_id    TEXT,
      element_class TEXT,
      element_text  TEXT,
      x_pos         INTEGER NOT NULL,
      y_pos         INTEGER NOT NULL,
      viewport_w    INTEGER NOT NULL,
      viewport_h    INTEGER NOT NULL,
      referrer      TEXT,
      user_agent    TEXT,
      ip            TEXT,
      metadata      TEXT,
      created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_click_events_created_at  ON click_events(created_at);
    CREATE INDEX IF NOT EXISTS idx_click_events_session_id  ON click_events(session_id);
    CREATE INDEX IF NOT EXISTS idx_click_events_page_url    ON click_events(page_url);
    CREATE INDEX IF NOT EXISTS idx_click_events_element_tag ON click_events(element_tag);
  `);
}
