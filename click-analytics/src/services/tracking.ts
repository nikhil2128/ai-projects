import { getDb } from "../database/connection";
import type { ClickEventInput, ClickEvent } from "../types";

export function insertClick(
  event: ClickEventInput,
  ip: string | null
): ClickEvent {
  const db = getDb();

  const stmt = db.prepare(`
    INSERT INTO click_events
      (session_id, page_url, element_tag, element_id, element_class, element_text,
       x_pos, y_pos, viewport_w, viewport_h, referrer, user_agent, ip, metadata)
    VALUES
      (@sessionId, @pageUrl, @elementTag, @elementId, @elementClass, @elementText,
       @xPos, @yPos, @viewportWidth, @viewportHeight, @referrer, @userAgent, @ip, @metadata)
  `);

  const result = stmt.run({
    sessionId: event.sessionId,
    pageUrl: event.pageUrl,
    elementTag: event.elementTag,
    elementId: event.elementId ?? null,
    elementClass: event.elementClass ?? null,
    elementText: event.elementText ?? null,
    xPos: event.xPos,
    yPos: event.yPos,
    viewportWidth: event.viewportWidth,
    viewportHeight: event.viewportHeight,
    referrer: event.referrer ?? null,
    userAgent: event.userAgent ?? null,
    ip,
    metadata: event.metadata ? JSON.stringify(event.metadata) : null,
  });

  return {
    ...event,
    id: result.lastInsertRowid as number,
    createdAt: new Date().toISOString(),
    ip,
  };
}

export function insertClicksBatch(
  events: ClickEventInput[],
  ip: string | null
): number {
  const db = getDb();

  const stmt = db.prepare(`
    INSERT INTO click_events
      (session_id, page_url, element_tag, element_id, element_class, element_text,
       x_pos, y_pos, viewport_w, viewport_h, referrer, user_agent, ip, metadata)
    VALUES
      (@sessionId, @pageUrl, @elementTag, @elementId, @elementClass, @elementText,
       @xPos, @yPos, @viewportWidth, @viewportHeight, @referrer, @userAgent, @ip, @metadata)
  `);

  const insertMany = db.transaction((items: ClickEventInput[]) => {
    for (const event of items) {
      stmt.run({
        sessionId: event.sessionId,
        pageUrl: event.pageUrl,
        elementTag: event.elementTag,
        elementId: event.elementId ?? null,
        elementClass: event.elementClass ?? null,
        elementText: event.elementText ?? null,
        xPos: event.xPos,
        yPos: event.yPos,
        viewportWidth: event.viewportWidth,
        viewportHeight: event.viewportHeight,
        referrer: event.referrer ?? null,
        userAgent: event.userAgent ?? null,
        ip,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
      });
    }
    return items.length;
  });

  return insertMany(events);
}
