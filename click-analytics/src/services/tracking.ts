import { getPool } from "../database/connection";
import type { QueuedEvent } from "../types";

const COLUMNS = [
  "website_id",
  "session_id",
  "page_url",
  "element_tag",
  "element_id",
  "element_class",
  "element_text",
  "x_pos",
  "y_pos",
  "viewport_w",
  "viewport_h",
  "referrer",
  "user_agent",
  "ip",
  "metadata",
  "created_at",
] as const;

const COL_COUNT = COLUMNS.length;

function eventToRow(e: QueuedEvent): unknown[] {
  return [
    e.websiteId,
    e.sessionId,
    e.pageUrl,
    e.elementTag,
    e.elementId ?? null,
    e.elementClass ?? null,
    e.elementText ?? null,
    e.xPos,
    e.yPos,
    e.viewportWidth,
    e.viewportHeight,
    e.referrer ?? null,
    e.userAgent ?? null,
    e.ip,
    e.metadata ? JSON.stringify(e.metadata) : null,
    e.receivedAt,
  ];
}

/**
 * Efficient multi-row INSERT for batch processing.
 * With 16 columns and batch size 500, generates 8000 parameters —
 * well within PostgreSQL's 65 535 parameter limit.
 */
export async function insertClicksBatch(events: QueuedEvent[]): Promise<number> {
  if (events.length === 0) return 0;

  const pool = getPool();

  const placeholders: string[] = [];
  const values: unknown[] = [];

  for (let i = 0; i < events.length; i++) {
    const offset = i * COL_COUNT;
    const row = COLUMNS.map((_, j) => `$${offset + j + 1}`);
    placeholders.push(`(${row.join(", ")})`);
    values.push(...eventToRow(events[i]));
  }

  const result = await pool.query(
    `INSERT INTO click_events (${COLUMNS.join(", ")})
     VALUES ${placeholders.join(", ")}`,
    values
  );

  return result.rowCount ?? 0;
}
