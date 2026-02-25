import { createPool } from "../../../shared/database";
import { runMigrations } from "../../../shared/migrations";
import { createApp } from "./app";
import { setupGracefulShutdown } from "../../../shared/graceful-shutdown";

const PORT = process.env.PORT ?? 3004;

async function main() {
  const pool = createPool();
  await runMigrations(pool);

  const { app } = createApp(pool);

  const server = app.listen(PORT, () => {
    console.log(`Order service running on http://localhost:${PORT}`);
  });

  setupGracefulShutdown(server, "order", () => pool.end());
}

main().catch((err) => {
  console.error("Failed to start order service:", err);
  process.exit(1);
});
