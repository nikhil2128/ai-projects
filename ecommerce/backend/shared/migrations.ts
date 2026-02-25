import { Pool } from "pg";

const MIGRATIONS = `
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY,
  email       VARCHAR(255) NOT NULL UNIQUE,
  name        VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
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
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
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
`;

const SAFE_MIGRATIONS = MIGRATIONS.replace(
  /CREATE INDEX IF NOT EXISTS idx_products_name_trgm[^;]*;/,
  `
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
  END IF;
END $$;`
);

export async function runMigrations(pool: Pool): Promise<void> {
  await pool.query(SAFE_MIGRATIONS);
}
