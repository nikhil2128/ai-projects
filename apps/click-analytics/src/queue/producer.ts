import { getRedis } from "./redis";
import { config } from "../config";
import type { QueuedEvent } from "../types";

export async function pushToStream(
  event: QueuedEvent
): Promise<string | null> {
  try {
    const redis = getRedis();
    if (redis.status !== "ready") return null;

    const id = await redis.xadd(
      config.redis.streamKey,
      "MAXLEN",
      "~",
      String(config.redis.maxStreamLen),
      "*",
      "data",
      JSON.stringify(event)
    );
    return id;
  } catch (err) {
    console.error("[PRODUCER] Push failed:", (err as Error).message);
    return null;
  }
}

export async function pushBatchToStream(
  events: QueuedEvent[]
): Promise<number> {
  try {
    const redis = getRedis();
    if (redis.status !== "ready") return 0;

    const pipeline = redis.pipeline();
    for (const event of events) {
      pipeline.xadd(
        config.redis.streamKey,
        "MAXLEN",
        "~",
        String(config.redis.maxStreamLen),
        "*",
        "data",
        JSON.stringify(event)
      );
    }

    const results = await pipeline.exec();
    if (!results) return 0;
    return results.filter(([err]) => !err).length;
  } catch (err) {
    console.error("[PRODUCER] Batch push failed:", (err as Error).message);
    return 0;
  }
}
