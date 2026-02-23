import { Order } from "../../../shared/types";

export class OrderStore {
  private orders: Map<string, Order> = new Map();

  addOrder(order: Order): void {
    this.orders.set(order.id, order);
  }

  findOrderById(id: string): Order | undefined {
    return this.orders.get(id);
  }

  findOrdersByUserId(userId: string): Order[] {
    return Array.from(this.orders.values()).filter(
      (o) => o.userId === userId
    );
  }

  updateOrder(order: Order): void {
    this.orders.set(order.id, order);
  }
}
