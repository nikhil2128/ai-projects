import { createPool } from "../../../shared/database";
import { runMigrations } from "../../../shared/migrations";
import { createApp } from "./app";

const PORT = process.env.PORT ?? 3002;

async function main() {
  const pool = createPool();
  await runMigrations(pool);

  const { app } = createApp(pool);

  app.listen(PORT, () => {
    console.log(`Product service running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start product service:", err);
  process.exit(1);
});
