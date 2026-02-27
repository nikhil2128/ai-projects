import { createPool } from "../../../shared/database";
import { runMigrations } from "../../../shared/migrations";
import { createApp } from "./app";

const PORT = process.env.PORT ?? 3003;

async function main() {
  const pool = createPool();
  await runMigrations(pool);

  const { app } = createApp(pool);

  app.listen(PORT, () => {
    console.log(`Cart service running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start cart service:", err);
  process.exit(1);
});
