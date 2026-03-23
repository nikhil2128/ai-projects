import { pushBatchToStream } from "../queue/producer";
import { isRedisHealthy } from "../queue/redis";
import { config } from "../config";
import type { QueuedEvent } from "../types";

const buffer: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

export function pushToBuffer(event: QueuedEvent): void {
  if (buffer.length >= config.buffer.maxSize) {
    buffer.shift();
    console.warn(
      `[BUFFER] Full (${config.buffer.maxSize} events), dropped oldest`
    );
  }
  buffer.push(event);
}

export function getBufferSize(): number {
  return buffer.length;
}

export function startBufferFlush(): void {
  if (flushTimer) return;

  flushTimer = setInterval(async () => {
    if (buffer.length === 0) return;

    const healthy = await isRedisHealthy();
    if (!healthy) return;

    const batch = buffer.splice(0, 500);
    const pushed = await pushBatchToStream(batch);

    if (pushed < batch.length) {
      const unpushed = batch.slice(pushed);
      buffer.unshift(...unpushed);
      console.warn(`[BUFFER] Partial flush: ${pushed}/${batch.length}`);
    } else if (pushed > 0) {
      console.log(
        `[BUFFER] Flushed ${pushed} events, ${buffer.length} remaining`
      );
    }
  }, config.buffer.flushIntervalMs);
}

export function stopBufferFlush(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}
