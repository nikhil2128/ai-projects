import { createPool } from "../../../shared/database";
import { runMigrations } from "../../../shared/migrations";
import { createApp } from "./app";
import { setupGracefulShutdown } from "../../../shared/graceful-shutdown";

const PORT = process.env.PORT ?? 3005;

async function main() {
  const pool = createPool();
  await runMigrations(pool);

  const { app } = createApp(pool);

  const server = app.listen(PORT, () => {
    console.log(`Payment service running on http://localhost:${PORT}`);
  });

  setupGracefulShutdown(server, "payment", () => pool.end());
}

main().catch((err) => {
  console.error("Failed to start payment service:", err);
  process.exit(1);
});
