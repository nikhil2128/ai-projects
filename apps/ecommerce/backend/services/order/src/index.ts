import { createPool } from "../../../shared/database";
import { runMigrations } from "../../../shared/migrations";
import { createApp } from "./app";

const PORT = process.env.PORT ?? 3004;

async function main() {
  const pool = createPool();
  await runMigrations(pool);

  const { app } = createApp(pool);

  app.listen(PORT, () => {
    console.log(`Order service running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start order service:", err);
  process.exit(1);
});
