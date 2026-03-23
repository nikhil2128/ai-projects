import { Pool } from "pg";
import { Order, OrderItem, OrderStatus } from "../../../shared/types";

export class OrderStore {
  constructor(private pool: Pool) {}

  async addOrder(order: Order): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `INSERT INTO orders (id, user_id, total_amount, status, shipping_address, payment_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          order.id,
          order.userId,
          order.totalAmount,
          order.status,
          order.shippingAddress,
          order.paymentId ?? null,
          order.createdAt,
          order.updatedAt,
        ]
      );

      for (const item of order.items) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
           VALUES ($1, $2, $3, $4, $5)`,
          [order.id, item.productId, item.productName, item.price, item.quantity]
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

  async findOrderById(id: string): Promise<Order | undefined> {
    const { rows: orderRows } = await this.pool.query(
      "SELECT * FROM orders WHERE id = $1",
      [id]
    );
    if (orderRows.length === 0) return undefined;

    const { rows: itemRows } = await this.pool.query(
      "SELECT * FROM order_items WHERE order_id = $1",
      [id]
    );

    return this.toOrder(orderRows[0], itemRows);
  }

  async findOrdersByUserId(userId: string): Promise<Order[]> {
    const { rows: orderRows } = await this.pool.query(
      "SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    if (orderRows.length === 0) return [];

    const orderIds = orderRows.map((r) => r.id);
    const { rows: itemRows } = await this.pool.query(
      "SELECT * FROM order_items WHERE order_id = ANY($1)",
      [orderIds]
    );

    const itemsByOrder = new Map<string, Record<string, unknown>[]>();
    for (const item of itemRows) {
      const orderId = item.order_id as string;
      if (!itemsByOrder.has(orderId)) itemsByOrder.set(orderId, []);
      itemsByOrder.get(orderId)!.push(item);
    }

    return orderRows.map((row) =>
      this.toOrder(row, itemsByOrder.get(row.id as string) ?? [])
    );
  }

  async updateOrder(order: Order): Promise<void> {
    await this.pool.query(
      `UPDATE orders
       SET status = $2, payment_id = $3, updated_at = $4
       WHERE id = $1`,
      [order.id, order.status, order.paymentId ?? null, order.updatedAt]
    );
  }

  private toOrder(
    row: Record<string, unknown>,
    itemRows: Record<string, unknown>[]
  ): Order {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      items: itemRows.map((ir) => this.toOrderItem(ir)),
      totalAmount: Number(row.total_amount),
      status: row.status as OrderStatus,
      shippingAddress: row.shipping_address as string,
      paymentId: (row.payment_id as string) ?? undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private toOrderItem(row: Record<string, unknown>): OrderItem {
    return {
      productId: row.product_id as string,
      productName: row.product_name as string,
      price: Number(row.price),
      quantity: row.quantity as number,
    };
  }
}
