import { Router } from "express";
import { z } from "zod";
import { ClickEventSchema } from "../types";
import type { ClickEventInput, QueuedEvent } from "../types";
import { validateBody } from "../middleware/validation";
import { pushToStream, pushBatchToStream } from "../queue/producer";
import { pushToBuffer, getBufferSize } from "../buffer/memory";

const router = Router();

function toQueuedEvent(event: ClickEventInput, ip: string | null): QueuedEvent {
  let websiteId = event.websiteId;
  if (!websiteId) {
    try {
      websiteId = new URL(event.pageUrl).hostname;
    } catch {
      websiteId = "unknown";
    }
  }

  return {
    websiteId,
    sessionId: event.sessionId,
    pageUrl: event.pageUrl,
    elementTag: event.elementTag,
    elementId: event.elementId,
    elementClass: event.elementClass,
    elementText: event.elementText,
    xPos: event.xPos,
    yPos: event.yPos,
    viewportWidth: event.viewportWidth,
    viewportHeight: event.viewportHeight,
    referrer: event.referrer,
    userAgent: event.userAgent,
    ip,
    metadata: event.metadata,
    receivedAt: new Date().toISOString(),
  };
}

router.post("/track", validateBody(ClickEventSchema), async (req, res) => {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.ip ||
    null;

  const queued = toQueuedEvent(req.body, ip);
  const streamId = await pushToStream(queued);

  if (!streamId) {
    pushToBuffer(queued);
  }

  res.status(202).json({ queued: true, timestamp: queued.receivedAt });
});

const BatchSchema = z.object({
  events: z.array(ClickEventSchema).min(1).max(1000),
});

router.post("/track/batch", validateBody(BatchSchema), async (req, res) => {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.ip ||
    null;

  const events: QueuedEvent[] = (req.body.events as ClickEventInput[]).map(
    (e) => toQueuedEvent(e, ip)
  );

  const pushed = await pushBatchToStream(events);

  if (pushed < events.length) {
    const failed = events.slice(pushed);
    for (const event of failed) {
      pushToBuffer(event);
    }
  }

  res.status(202).json({ queued: events.length, timestamp: new Date().toISOString() });
});

router.get("/track/status", (_req, res) => {
  res.json({ bufferSize: getBufferSize() });
});

export default router;
