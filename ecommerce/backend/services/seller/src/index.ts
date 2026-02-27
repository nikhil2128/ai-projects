import { createPool } from "../../../shared/database";
import { runMigrations } from "../../../shared/migrations";
import { createApp } from "./app";
import { setupGracefulShutdown } from "../../../shared/graceful-shutdown";
import { CsvWorker } from "./csv-worker";
import { DlqProcessor } from "./dlq-processor";

const PORT = process.env.PORT ?? 3006;
const ENABLE_WORKERS = process.env.ENABLE_CSV_WORKERS !== "false";

async function main() {
  const pool = createPool();
  await runMigrations(pool);

  const { app, store, service } = createApp(pool);

  let csvWorker: CsvWorker | undefined;
  let dlqProcessor: DlqProcessor | undefined;

  if (ENABLE_WORKERS) {
    csvWorker = new CsvWorker(service, store);
    dlqProcessor = new DlqProcessor(service, store);
    csvWorker.start();
    dlqProcessor.start();
    console.log("CSV workers started (SQS queue + DLQ processor)");
  }

  const server = app.listen(PORT, () => {
    console.log(`Seller service running on http://localhost:${PORT}`);
  });

  setupGracefulShutdown(server, "seller", () => {
    csvWorker?.stop();
    dlqProcessor?.stop();
    return pool.end();
  });
}

main().catch((err) => {
  console.error("Failed to start seller service:", err);
  process.exit(1);
});
