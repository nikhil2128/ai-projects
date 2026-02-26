import { Pool } from "pg";

const MIGRATIONS = `
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY,
  email       VARCHAR(255) NOT NULL UNIQUE,
  name        VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role        VARCHAR(10) NOT NULL DEFAULT 'buyer',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_tokens (
  token   UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens(user_id);

CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price       DECIMAL(12,2) NOT NULL,
  category    VARCHAR(255) NOT NULL DEFAULT '',
  stock       INT NOT NULL DEFAULT 0,
  image_url   VARCHAR(2048) NOT NULL DEFAULT '',
  seller_id   UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS carts (
  id         UUID PRIMARY KEY,
  user_id    UUID NOT NULL UNIQUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id           SERIAL PRIMARY KEY,
  cart_id      UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  price        DECIMAL(12,2) NOT NULL,
  quantity     INT NOT NULL DEFAULT 1,
  UNIQUE(cart_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id               UUID PRIMARY KEY,
  user_id          UUID NOT NULL,
  total_amount     DECIMAL(12,2) NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'pending',
  shipping_address TEXT NOT NULL,
  payment_id       UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

CREATE TABLE IF NOT EXISTS order_items (
  id           SERIAL PRIMARY KEY,
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  price        DECIMAL(12,2) NOT NULL,
  quantity     INT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS payments (
  id             UUID PRIMARY KEY,
  order_id       UUID NOT NULL,
  user_id        UUID NOT NULL,
  amount         DECIMAL(12,2) NOT NULL,
  method         VARCHAR(20) NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'pending',
  transaction_id VARCHAR(255),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);

CREATE TABLE IF NOT EXISTS favorites (
  user_id    UUID NOT NULL,
  product_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);

CREATE TABLE IF NOT EXISTS batch_jobs (
  id UUID PRIMARY KEY,
  seller_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  total_rows INT NOT NULL DEFAULT 0,
  processed_rows INT NOT NULL DEFAULT 0,
  created_count INT NOT NULL DEFAULT 0,
  error_count INT NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]',
  file_name VARCHAR(255) NOT NULL DEFAULT '',
  retry_count INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 3,
  failed_at_row INT,
  csv_data TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batch_jobs_seller_id ON batch_jobs(seller_id);

CREATE TABLE IF NOT EXISTS seller_notifications (
  id UUID PRIMARY KEY,
  seller_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(500) NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_notifications_seller_id ON seller_notifications(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_notifications_read ON seller_notifications(seller_id, read);
`;

const SAFE_MIGRATIONS = MIGRATIONS.replace(
  /CREATE INDEX IF NOT EXISTS idx_products_name_trgm[^;]*;\n?/,
  ""
);

const POST_MIGRATIONS = [
  `DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
      CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='role') THEN
      ALTER TABLE users ADD COLUMN role VARCHAR(10) NOT NULL DEFAULT 'buyer';
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='seller_id') THEN
      ALTER TABLE products ADD COLUMN seller_id UUID;
      CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='batch_jobs' AND column_name='retry_count') THEN
      ALTER TABLE batch_jobs ADD COLUMN retry_count INT NOT NULL DEFAULT 0;
      ALTER TABLE batch_jobs ADD COLUMN max_retries INT NOT NULL DEFAULT 3;
      ALTER TABLE batch_jobs ADD COLUMN failed_at_row INT;
      ALTER TABLE batch_jobs ADD COLUMN csv_data TEXT;
    END IF;
  END $$`,
];

export async function runMigrations(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    // Advisory lock prevents concurrent migration runs across services
    await client.query("SELECT pg_advisory_lock(42)");
    await client.query(SAFE_MIGRATIONS);
    for (const sql of POST_MIGRATIONS) {
      try {
        await client.query(sql);
      } catch {
        // Non-critical: column/index may already exist
      }
    }
    await client.query("SELECT pg_advisory_unlock(42)");
  } finally {
    client.release();
  }
}
