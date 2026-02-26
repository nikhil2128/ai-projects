import { createPool } from "../../../shared/database";
import { runMigrations } from "../../../shared/migrations";
import { createApp } from "./app";
import { setupGracefulShutdown } from "../../../shared/graceful-shutdown";

const PORT = process.env.PORT ?? 3006;

async function main() {
  const pool = createPool();
  await runMigrations(pool);

  const { app } = createApp(pool);

  const server = app.listen(PORT, () => {
    console.log(`Seller service running on http://localhost:${PORT}`);
  });

  setupGracefulShutdown(server, "seller", () => pool.end());
}

main().catch((err) => {
  console.error("Failed to start seller service:", err);
  process.exit(1);
});
