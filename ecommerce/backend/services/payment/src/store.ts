import { Pool } from "pg";
import { Payment, PaymentMethod, PaymentStatus } from "../../../shared/types";

export class PaymentStore {
  constructor(private pool: Pool) {}

  async addPayment(payment: Payment): Promise<void> {
    await this.pool.query(
      `INSERT INTO payments (id, order_id, user_id, amount, method, status, transaction_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        payment.id,
        payment.orderId,
        payment.userId,
        payment.amount,
        payment.method,
        payment.status,
        payment.transactionId ?? null,
        payment.createdAt,
      ]
    );
  }

  async findPaymentById(id: string): Promise<Payment | undefined> {
    const { rows } = await this.pool.query(
      "SELECT * FROM payments WHERE id = $1",
      [id]
    );
    return rows[0] ? this.toPayment(rows[0]) : undefined;
  }

  async findPaymentByOrderId(orderId: string): Promise<Payment | undefined> {
    const { rows } = await this.pool.query(
      "SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1",
      [orderId]
    );
    return rows[0] ? this.toPayment(rows[0]) : undefined;
  }

  async updatePayment(payment: Payment): Promise<void> {
    await this.pool.query(
      `UPDATE payments SET status = $2, transaction_id = $3 WHERE id = $1`,
      [payment.id, payment.status, payment.transactionId ?? null]
    );
  }

  private toPayment(row: Record<string, unknown>): Payment {
    return {
      id: row.id as string,
      orderId: row.order_id as string,
      userId: row.user_id as string,
      amount: Number(row.amount),
      method: row.method as PaymentMethod,
      status: row.status as PaymentStatus,
      transactionId: (row.transaction_id as string) ?? undefined,
      createdAt: new Date(row.created_at as string),
    };
  }
}
