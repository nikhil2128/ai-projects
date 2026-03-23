import { createPool } from "./database";
import { runMigrations } from "./migrations";

async function main() {
  const pool = createPool();
  try {
    console.log("Running database migrations...");
    await runMigrations(pool);
    console.log("Migrations completed successfully.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
