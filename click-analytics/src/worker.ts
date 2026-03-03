import { config } from "./config";
import { initializeSchema } from "./database/schema";
import { closePool } from "./database/connection";
import { waitForRedis, closeRedis } from "./queue/redis";
import { initConsumerGroup, consumeEvents, stopConsumer } from "./queue/consumer";

async function main() {
  console.log(`[WORKER] Starting (consumer: ${config.worker.consumerId})…`);

  await waitForRedis();
  await initializeSchema();
  await initConsumerGroup();

  console.log(
    `[WORKER] Ready — batch=${config.worker.batchSize}, ` +
      `timeout=${config.worker.batchTimeoutMs}ms`
  );

  await consumeEvents();
}

async function shutdown() {
  console.log("[WORKER] Shutting down…");
  stopConsumer();

  // give current batch time to finish
  await new Promise((r) => setTimeout(r, 3_000));

  await closeRedis();
  await closePool();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((err) => {
  console.error("[WORKER] Fatal error:", err);
  process.exit(1);
});
