import { getRedis } from "./redis";
import { config } from "../config";
import { insertClicksBatch } from "../services/tracking";
import type { QueuedEvent } from "../types";

const { streamKey, consumerGroup } = config.redis;
const { consumerId, batchSize, batchTimeoutMs } = config.worker;

type StreamMessage = [id: string, fields: string[]];
type StreamReadResult = [key: string, messages: StreamMessage[]][] | null;

let running = true;

export function stopConsumer(): void {
  running = false;
}

export async function initConsumerGroup(): Promise<void> {
  const redis = getRedis();
  try {
    await redis.xgroup("CREATE", streamKey, consumerGroup, "0", "MKSTREAM");
    console.log(`[CONSUMER] Created consumer group '${consumerGroup}'`);
  } catch (err: unknown) {
    const msg = (err as Error).message || "";
    if (msg.includes("BUSYGROUP")) {
      console.log(`[CONSUMER] Consumer group '${consumerGroup}' already exists`);
    } else {
      throw err;
    }
  }
}

export async function consumeEvents(): Promise<void> {
  const redis = getRedis();

  // Phase 1: drain any events pending for this consumer from a previous crash
  await drainPending(redis);

  // Phase 2: consume new events
  while (running) {
    try {
      const streams = (await redis.xreadgroup(
        "GROUP",
        consumerGroup,
        consumerId,
        "COUNT",
        String(batchSize),
        "BLOCK",
        String(batchTimeoutMs),
        "STREAMS",
        streamKey,
        ">"
      )) as StreamReadResult;

      if (!streams || streams.length === 0) continue;

      const [, messages] = streams[0];
      if (messages.length === 0) continue;

      await processAndAck(redis, messages);
    } catch (err) {
      if (!running) break;
      console.error("[CONSUMER] Error:", (err as Error).message);
      await sleep(1_000);
    }
  }
}

async function drainPending(redis: InstanceType<typeof import("ioredis").default>): Promise<void> {
  while (running) {
    try {
      const streams = (await redis.xreadgroup(
        "GROUP",
        consumerGroup,
        consumerId,
        "COUNT",
        String(batchSize),
        "STREAMS",
        streamKey,
        "0"
      )) as StreamReadResult;

      if (!streams || streams.length === 0) break;

      const [, messages] = streams[0];
      if (messages.length === 0) break;

      console.log(`[CONSUMER] Reprocessing ${messages.length} pending events`);
      await processAndAck(redis, messages);
    } catch (err) {
      console.error("[CONSUMER] Pending drain error:", (err as Error).message);
      await sleep(1_000);
      break;
    }
  }
}

async function processAndAck(
  redis: InstanceType<typeof import("ioredis").default>,
  messages: StreamMessage[]
): Promise<void> {
  const events: QueuedEvent[] = [];
  const ids: string[] = [];

  for (const [id, fields] of messages) {
    ids.push(id);
    try {
      const event: QueuedEvent = JSON.parse(fields[1]);
      events.push(event);
    } catch {
      console.error(`[CONSUMER] Failed to parse message ${id}`);
    }
  }

  if (events.length > 0) {
    const persisted = await insertClicksBatch(events);
    if (persisted !== events.length) {
      throw new Error(
        `[CONSUMER] Persistence incomplete: ${persisted}/${events.length}`
      );
    }
    console.log(`[CONSUMER] Persisted batch of ${persisted} events`);
  }

  if (ids.length > 0) {
    await redis.xack(streamKey, consumerGroup, ...ids);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
