import { Pool } from "pg";
import { Cart, CartItem } from "../../../shared/types";

export class CartStore {
  constructor(private pool: Pool) {}

  async getCart(userId: string): Promise<Cart | undefined> {
    const { rows: cartRows } = await this.pool.query(
      "SELECT * FROM carts WHERE user_id = $1",
      [userId]
    );

    if (cartRows.length === 0) return undefined;

    const cart = cartRows[0];
    const { rows: itemRows } = await this.pool.query(
      "SELECT * FROM cart_items WHERE cart_id = $1",
      [cart.id]
    );

    return {
      id: cart.id as string,
      userId: cart.user_id as string,
      items: itemRows.map((r) => this.toCartItem(r)),
      updatedAt: new Date(cart.updated_at as string),
    };
  }

  async saveCart(cart: Cart): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `INSERT INTO carts (id, user_id, updated_at) VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO UPDATE SET updated_at = $3`,
        [cart.id, cart.userId, cart.updatedAt]
      );

      await client.query("DELETE FROM cart_items WHERE cart_id = $1", [
        cart.id,
      ]);

      for (const item of cart.items) {
        await client.query(
          `INSERT INTO cart_items (cart_id, product_id, product_name, price, quantity)
           VALUES ($1, $2, $3, $4, $5)`,
          [cart.id, item.productId, item.productName, item.price, item.quantity]
        );
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  private toCartItem(row: Record<string, unknown>): CartItem {
    return {
      productId: row.product_id as string,
      productName: row.product_name as string,
      price: Number(row.price),
      quantity: row.quantity as number,
    };
  }
}
