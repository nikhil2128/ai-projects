import { getPool } from "./connection";

export async function initializeSchema(): Promise<void> {
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS click_events (
      id            BIGSERIAL    PRIMARY KEY,
      website_id    TEXT         NOT NULL DEFAULT 'default',
      session_id    TEXT         NOT NULL,
      page_url      TEXT         NOT NULL,
      element_tag   TEXT         NOT NULL,
      element_id    TEXT,
      element_class TEXT,
      element_text  TEXT,
      x_pos         INTEGER      NOT NULL,
      y_pos         INTEGER      NOT NULL,
      viewport_w    INTEGER      NOT NULL,
      viewport_h    INTEGER      NOT NULL,
      referrer      TEXT,
      user_agent    TEXT,
      ip            TEXT,
      metadata      JSONB,
      created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_ce_created_at
      ON click_events (created_at);

    CREATE INDEX IF NOT EXISTS idx_ce_website_id
      ON click_events (website_id);

    CREATE INDEX IF NOT EXISTS idx_ce_session_id
      ON click_events (session_id);

    CREATE INDEX IF NOT EXISTS idx_ce_page_url
      ON click_events (page_url);

    CREATE INDEX IF NOT EXISTS idx_ce_website_created
      ON click_events (website_id, created_at);

    CREATE INDEX IF NOT EXISTS idx_ce_website_page
      ON click_events (website_id, page_url);
  `);
}
