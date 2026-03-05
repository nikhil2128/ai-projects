import { getDbClient } from "./connection";
import { config } from "../config";

export async function initializeSchema(): Promise<void> {
  const client = getDbClient();

  await client.command({
    query: `CREATE DATABASE IF NOT EXISTS ${config.clickhouse.database}`,
  });

  await client.command({
    query: `
      CREATE TABLE IF NOT EXISTS ${config.clickhouse.database}.click_events (
        event_id       UUID DEFAULT generateUUIDv4(),
        website_id     LowCardinality(String),
        session_id     String,
        page_url       String,
        element_tag    LowCardinality(String),
        element_id     Nullable(String),
        element_class  Nullable(String),
        element_text   Nullable(String),
        x_pos          UInt32,
        y_pos          UInt32,
        viewport_w     UInt32,
        viewport_h     UInt32,
        referrer       Nullable(String),
        user_agent     Nullable(String),
        ip             Nullable(String),
        metadata       Nullable(String),
        event_time     DateTime64(3, 'UTC'),
        ingested_at    DateTime64(3, 'UTC') DEFAULT now64(3)
      )
      ENGINE = MergeTree
      PARTITION BY toYYYYMM(event_time)
      ORDER BY (website_id, page_url, event_time, session_id)
      TTL event_time + INTERVAL 365 DAY DELETE
      SETTINGS index_granularity = 8192
    `,
  });
}
