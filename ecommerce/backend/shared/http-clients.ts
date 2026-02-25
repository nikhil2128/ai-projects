import {
  Product,
  Cart,
  Order,
  OrderStatus,
  ProductServiceClient,
  CartServiceClient,
  OrderServiceClient,
} from "./types";
import { CircuitBreaker } from "./circuit-breaker";
import { TTLCache } from "./cache";

const productCache = new TTLCache<Product>(30_000);

export class HttpProductClient implements ProductServiceClient {
  private breaker: CircuitBreaker;

  constructor(private baseUrl: string) {
    this.breaker = new CircuitBreaker("product-service");
  }

  async getProduct(productId: string): Promise<Product | null> {
    const cached = productCache.get(`product:${productId}`);
    if (cached) return cached;

    return this.breaker.execute(async () => {
      const res = await fetch(`${this.baseUrl}/internal/${productId}`);
      if (!res.ok) return null;
      const product: Product = await res.json();
      productCache.set(`product:${productId}`, product);
      return product;
    });
  }

  async getProducts(productIds: string[]): Promise<Map<string, Product>> {
    const result = new Map<string, Product>();
    const uncachedIds: string[] = [];

    for (const id of productIds) {
      const cached = productCache.get(`product:${id}`);
      if (cached) {
        result.set(id, cached);
      } else {
        uncachedIds.push(id);
      }
    }

    if (uncachedIds.length > 0) {
      const products = await this.breaker.execute(async () => {
        const res = await fetch(`${this.baseUrl}/internal/batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: uncachedIds }),
        });
        if (!res.ok) return [];
        return res.json() as Promise<Product[]>;
      });

      for (const product of products) {
        result.set(product.id, product);
        productCache.set(`product:${product.id}`, product);
      }
    }

    return result;
  }

  async updateStock(productId: string, newStock: number): Promise<boolean> {
    productCache.delete(`product:${productId}`);

    return this.breaker.execute(async () => {
      const res = await fetch(
        `${this.baseUrl}/internal/stock/${productId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stock: newStock }),
        }
      );
      return res.ok;
    });
  }
}

export class HttpCartClient implements CartServiceClient {
  private breaker: CircuitBreaker;

  constructor(private baseUrl: string) {
    this.breaker = new CircuitBreaker("cart-service");
  }

  async getCart(userId: string): Promise<Cart | null> {
    return this.breaker.execute(async () => {
      const res = await fetch(`${this.baseUrl}/internal/${userId}`);
      if (!res.ok) return null;
      return res.json();
    });
  }

  async clearCart(userId: string): Promise<void> {
    await this.breaker.execute(async () => {
      await fetch(`${this.baseUrl}/internal/${userId}`, { method: "DELETE" });
    });
  }
}

export class HttpOrderClient implements OrderServiceClient {
  private breaker: CircuitBreaker;

  constructor(private baseUrl: string) {
    this.breaker = new CircuitBreaker("order-service");
  }

  async getOrder(orderId: string): Promise<Order | null> {
    return this.breaker.execute(async () => {
      const res = await fetch(`${this.baseUrl}/internal/${orderId}`);
      if (!res.ok) return null;
      return res.json();
    });
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    paymentId?: string
  ): Promise<boolean> {
    return this.breaker.execute(async () => {
      const res = await fetch(`${this.baseUrl}/internal/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, paymentId }),
      });
      return res.ok;
    });
  }
}
