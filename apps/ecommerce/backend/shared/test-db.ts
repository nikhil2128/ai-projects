import { Pool } from "pg";
import { createPool } from "./database";
import { runMigrations } from "./migrations";

let _pool: Pool | null = null;

export async function getTestPool(): Promise<Pool> {
  if (_pool) return _pool;

  _pool = createPool({
    database: process.env.DB_NAME ?? "ecommerce_test",
    max: 5,
  });

  await runMigrations(_pool);
  return _pool;
}

export async function cleanTables(pool: Pool): Promise<void> {
  await pool.query(`
    TRUNCATE TABLE payments, order_items, orders,
                   cart_items, carts, auth_tokens, users, products
    CASCADE
  `);
}

export async function closeTestPool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}
