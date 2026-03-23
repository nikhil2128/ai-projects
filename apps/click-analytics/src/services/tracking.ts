import { getDbClient } from "../database/connection";
import { config } from "../config";
import { pushBatchToKinesis } from "../pipeline/kinesis";
import type { QueuedEvent } from "../types";

const CLICK_EVENTS_TABLE = `${config.clickhouse.database}.click_events`;

function eventToRow(e: QueuedEvent): Record<string, unknown> {
  return {
    website_id: e.websiteId,
    session_id: e.sessionId,
    page_url: e.pageUrl,
    element_tag: e.elementTag,
    element_id: e.elementId ?? null,
    element_class: e.elementClass ?? null,
    element_text: e.elementText ?? null,
    x_pos: e.xPos,
    y_pos: e.yPos,
    viewport_w: e.viewportWidth,
    viewport_h: e.viewportHeight,
    referrer: e.referrer ?? null,
    user_agent: e.userAgent ?? null,
    ip: e.ip,
    metadata: e.metadata ? JSON.stringify(e.metadata) : null,
    event_time: e.receivedAt,
  };
}

export async function insertClicksBatch(events: QueuedEvent[]): Promise<number> {
  if (events.length === 0) return 0;

  if (config.pipeline.mode === "kinesis-s3-clickhouse") {
    const persisted = await pushBatchToKinesis(events);
    if (persisted !== events.length) {
      throw new Error(
        `[TRACKING] Partial Kinesis write: ${persisted}/${events.length}`
      );
    }
    return persisted;
  }

  const clickhouse = getDbClient();
  await clickhouse.insert({
    table: CLICK_EVENTS_TABLE,
    values: events.map(eventToRow),
    format: "JSONEachRow",
  });

  return events.length;
}
