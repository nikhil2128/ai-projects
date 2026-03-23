import { Pool, PoolConfig } from "pg";

export function createPool(overrides?: Partial<PoolConfig>): Pool {
  const config: PoolConfig = {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? "ecommerce",
    user: process.env.DB_USER ?? "ecommerce",
    password: process.env.DB_PASSWORD ?? "ecommerce",
    max: Number(process.env.DB_POOL_MAX ?? 10),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT ?? 30_000),
    connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT ?? 5_000),
    ...overrides,
  };

  const pool = new Pool(config);

  pool.on("error", (err) => {
    console.error("Unexpected database pool error:", err.message);
  });

  return pool;
}
