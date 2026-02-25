import { Pool } from "pg";

export class FavoriteStore {
  constructor(private pool: Pool) {}

  async add(userId: string, productId: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO favorites (user_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, productId]
    );
  }

  async remove(userId: string, productId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM favorites WHERE user_id = $1 AND product_id = $2`,
      [userId, productId]
    );
  }

  async getProductIds(userId: string): Promise<string[]> {
    const { rows } = await this.pool.query(
      `SELECT product_id FROM favorites WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return rows.map((r) => r.product_id as string);
  }

  async checkBatch(userId: string, productIds: string[]): Promise<string[]> {
    if (productIds.length === 0) return [];
    const { rows } = await this.pool.query(
      `SELECT product_id FROM favorites WHERE user_id = $1 AND product_id = ANY($2)`,
      [userId, productIds]
    );
    return rows.map((r) => r.product_id as string);
  }

  async count(userId: string): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT COUNT(*)::int AS count FROM favorites WHERE user_id = $1`,
      [userId]
    );
    return rows[0].count;
  }
}
