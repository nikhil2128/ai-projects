import { Pool } from "pg";
import { OrderPlacedEvent } from "../../../shared/types";
import { sendEmail } from "../../../shared/ses";

export class NotificationService {
  constructor(private pool: Pool) {}

  async handleOrderPlaced(event: OrderPlacedEvent): Promise<void> {
    const [buyerEmail, sellerEmails] = await Promise.all([
      this.getBuyerEmail(event.userId),
      this.getSellerEmails(event.items.map((i) => i.productId)),
    ]);

    const tasks: Promise<void>[] = [];

    if (buyerEmail) {
      tasks.push(this.sendBuyerConfirmation(buyerEmail, event));
    }

    for (const email of sellerEmails) {
      tasks.push(this.sendSellerNotification(email, event));
    }

    await Promise.all(tasks);
  }

  private async getBuyerEmail(userId: string): Promise<string | null> {
    const { rows } = await this.pool.query(
      "SELECT email FROM users WHERE id = $1",
      [userId]
    );
    return rows.length > 0 ? (rows[0].email as string) : null;
  }

  private async getSellerEmails(productIds: string[]): Promise<string[]> {
    const { rows } = await this.pool.query(
      `SELECT DISTINCT u.email
       FROM products p
       JOIN users u ON u.id = p.seller_id
       WHERE p.id = ANY($1) AND p.seller_id IS NOT NULL`,
      [productIds]
    );
    return rows.map((r) => r.email as string);
  }

  private async sendBuyerConfirmation(
    email: string,
    event: OrderPlacedEvent
  ): Promise<void> {
    const shortId = event.orderId.slice(0, 8);
    const subject = `Order Confirmation — #${shortId}`;

    const itemsText = event.items
      .map(
        (i) =>
          `  • ${i.productName} x${i.quantity} — $${(i.price * i.quantity).toFixed(2)}`
      )
      .join("\n");

    const textBody = [
      "Your order has been placed successfully!",
      "",
      `Order ID: ${event.orderId}`,
      `Total: $${event.totalAmount.toFixed(2)}`,
      `Shipping to: ${event.shippingAddress}`,
      "",
      "Items:",
      itemsText,
    ].join("\n");

    const itemsHtml = event.items
      .map(
        (i) =>
          `<li>${i.productName} &times;${i.quantity} &mdash; $${(i.price * i.quantity).toFixed(2)}</li>`
      )
      .join("");

    const htmlBody = `
      <h2>Order Confirmation</h2>
      <p>Your order has been placed successfully!</p>
      <p><strong>Order ID:</strong> ${event.orderId}</p>
      <p><strong>Total:</strong> $${event.totalAmount.toFixed(2)}</p>
      <p><strong>Shipping to:</strong> ${event.shippingAddress}</p>
      <h3>Items</h3>
      <ul>${itemsHtml}</ul>
    `;

    await sendEmail([email], subject, htmlBody, textBody);
  }

  private async sendSellerNotification(
    email: string,
    event: OrderPlacedEvent
  ): Promise<void> {
    const shortId = event.orderId.slice(0, 8);
    const subject = `New Order Received — #${shortId}`;

    const itemsText = event.items
      .map(
        (i) =>
          `  • ${i.productName} x${i.quantity} — $${(i.price * i.quantity).toFixed(2)}`
      )
      .join("\n");

    const textBody = [
      "You have received a new order!",
      "",
      `Order ID: ${event.orderId}`,
      `Total: $${event.totalAmount.toFixed(2)}`,
      "",
      "Items ordered:",
      itemsText,
    ].join("\n");

    const itemsHtml = event.items
      .map(
        (i) =>
          `<li>${i.productName} &times;${i.quantity} &mdash; $${(i.price * i.quantity).toFixed(2)}</li>`
      )
      .join("");

    const htmlBody = `
      <h2>New Order Received</h2>
      <p>You have received a new order!</p>
      <p><strong>Order ID:</strong> ${event.orderId}</p>
      <p><strong>Total:</strong> $${event.totalAmount.toFixed(2)}</p>
      <h3>Items Ordered</h3>
      <ul>${itemsHtml}</ul>
    `;

    await sendEmail([email], subject, htmlBody, textBody);
  }
}
