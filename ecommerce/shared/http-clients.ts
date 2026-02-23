import {
  Product,
  Cart,
  Order,
  OrderStatus,
  ProductServiceClient,
  CartServiceClient,
  OrderServiceClient,
} from "./types";

export class HttpProductClient implements ProductServiceClient {
  constructor(private baseUrl: string) {}

  async getProduct(productId: string): Promise<Product | null> {
    const res = await fetch(`${this.baseUrl}/internal/${productId}`);
    if (!res.ok) return null;
    return res.json();
  }

  async updateStock(productId: string, newStock: number): Promise<boolean> {
    const res = await fetch(
      `${this.baseUrl}/internal/stock/${productId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: newStock }),
      }
    );
    return res.ok;
  }
}

export class HttpCartClient implements CartServiceClient {
  constructor(private baseUrl: string) {}

  async getCart(userId: string): Promise<Cart | null> {
    const res = await fetch(`${this.baseUrl}/internal/${userId}`);
    if (!res.ok) return null;
    return res.json();
  }

  async clearCart(userId: string): Promise<void> {
    await fetch(`${this.baseUrl}/internal/${userId}`, { method: "DELETE" });
  }
}

export class HttpOrderClient implements OrderServiceClient {
  constructor(private baseUrl: string) {}

  async getOrder(orderId: string): Promise<Order | null> {
    const res = await fetch(`${this.baseUrl}/internal/${orderId}`);
    if (!res.ok) return null;
    return res.json();
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    paymentId?: string
  ): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/internal/${orderId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, paymentId }),
    });
    return res.ok;
  }
}
