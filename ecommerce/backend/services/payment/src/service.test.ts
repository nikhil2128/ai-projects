import { describe, it, expect, beforeEach } from "vitest";
import { PaymentService } from "./service";
import { PaymentStore } from "./store";
import {
  Order,
  OrderStatus,
  Product,
  OrderServiceClient,
  ProductServiceClient,
} from "../../../shared/types";

class MockOrderClient implements OrderServiceClient {
  private orders: Map<string, Order> = new Map();

  addOrder(order: Order): void {
    this.orders.set(order.id, order);
  }

  async getOrder(orderId: string): Promise<Order | null> {
    return this.orders.get(orderId) ?? null;
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    paymentId?: string
  ): Promise<boolean> {
    const order = this.orders.get(orderId);
    if (!order) return false;
    order.status = status;
    if (paymentId) order.paymentId = paymentId;
    order.updatedAt = new Date();
    return true;
  }
}

class MockProductClient implements ProductServiceClient {
  private products: Map<string, Product> = new Map();

  addProduct(product: Product): void {
    this.products.set(product.id, product);
  }

  async getProduct(productId: string): Promise<Product | null> {
    return this.products.get(productId) ?? null;
  }

  async getProducts(productIds: string[]): Promise<Map<string, Product>> {
    const result = new Map<string, Product>();
    for (const id of productIds) {
      const p = this.products.get(id);
      if (p) result.set(id, p);
    }
    return result;
  }

  async updateStock(productId: string, newStock: number): Promise<boolean> {
    const product = this.products.get(productId);
    if (!product) return false;
    product.stock = newStock;
    return true;
  }
}

describe("PaymentService", () => {
  let paymentService: PaymentService;
  let orderClient: MockOrderClient;
  let productClient: MockProductClient;
  const userId = "user-1";
  let orderId: string;
  const mouseId = "product-mouse";

  beforeEach(() => {
    const store = new PaymentStore();
    orderClient = new MockOrderClient();
    productClient = new MockProductClient();

    productClient.addProduct({
      id: mouseId,
      name: "Wireless Mouse",
      description: "Ergonomic wireless mouse",
      price: 29.99,
      category: "Electronics",
      stock: 8,
      imageUrl: "",
      createdAt: new Date(),
    });

    orderId = "order-1";
    const now = new Date();
    orderClient.addOrder({
      id: orderId,
      userId,
      items: [
        {
          productId: mouseId,
          productName: "Wireless Mouse",
          price: 29.99,
          quantity: 2,
        },
      ],
      totalAmount: 59.98,
      status: "pending",
      shippingAddress: "123 Main St, City",
      createdAt: now,
      updatedAt: now,
    });

    paymentService = new PaymentService(store, orderClient, productClient);
  });

  describe("processPayment", () => {
    it("should process payment for an order", async () => {
      const result = await paymentService.processPayment({
        orderId,
        userId,
        method: "credit_card",
      });

      expect(result.success).toBe(true);
      expect(result.data!.status).toBe("completed");
      expect(result.data!.amount).toBeCloseTo(29.99 * 2, 2);
      expect(result.data!.method).toBe("credit_card");
      expect(result.data!.transactionId).toBeDefined();
    });

    it("should update order status to confirmed after payment", async () => {
      await paymentService.processPayment({
        orderId,
        userId,
        method: "credit_card",
      });

      const order = await orderClient.getOrder(orderId);
      expect(order!.status).toBe("confirmed");
      expect(order!.paymentId).toBeDefined();
    });

    it("should reject payment for non-existent order", async () => {
      const result = await paymentService.processPayment({
        orderId: "fake-order-id",
        userId,
        method: "credit_card",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Order not found");
    });

    it("should reject payment for another user's order", async () => {
      const result = await paymentService.processPayment({
        orderId,
        userId: "other-user",
        method: "credit_card",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Order not found");
    });

    it("should reject duplicate payment for same order", async () => {
      await paymentService.processPayment({
        orderId,
        userId,
        method: "credit_card",
      });

      const result = await paymentService.processPayment({
        orderId,
        userId,
        method: "credit_card",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("already been paid");
    });

    it("should reject payment for cancelled order", async () => {
      await orderClient.updateOrderStatus(orderId, "cancelled");

      const result = await paymentService.processPayment({
        orderId,
        userId,
        method: "credit_card",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot pay for");
    });

    it("should support different payment methods", async () => {
      const result = await paymentService.processPayment({
        orderId,
        userId,
        method: "paypal",
      });

      expect(result.success).toBe(true);
      expect(result.data!.method).toBe("paypal");
    });
  });

  describe("getPayment", () => {
    it("should retrieve payment by ID", async () => {
      const paid = await paymentService.processPayment({
        orderId,
        userId,
        method: "credit_card",
      });

      const result = paymentService.getPayment(paid.data!.id, userId);
      expect(result.success).toBe(true);
      expect(result.data!.id).toBe(paid.data!.id);
    });

    it("should not allow viewing another user's payment", async () => {
      const paid = await paymentService.processPayment({
        orderId,
        userId,
        method: "credit_card",
      });

      const result = paymentService.getPayment(paid.data!.id, "other-user");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Payment not found");
    });
  });

  describe("refundPayment", () => {
    it("should refund a completed payment", async () => {
      const paid = await paymentService.processPayment({
        orderId,
        userId,
        method: "credit_card",
      });

      const result = await paymentService.refundPayment(paid.data!.id, userId);
      expect(result.success).toBe(true);
      expect(result.data!.status).toBe("refunded");
    });

    it("should update order status to cancelled on refund", async () => {
      const paid = await paymentService.processPayment({
        orderId,
        userId,
        method: "credit_card",
      });

      await paymentService.refundPayment(paid.data!.id, userId);

      const order = await orderClient.getOrder(orderId);
      expect(order!.status).toBe("cancelled");
    });

    it("should restore product stock on refund", async () => {
      const paid = await paymentService.processPayment({
        orderId,
        userId,
        method: "credit_card",
      });

      const stockBefore = (await productClient.getProduct(mouseId))!.stock;
      await paymentService.refundPayment(paid.data!.id, userId);
      const stockAfter = (await productClient.getProduct(mouseId))!.stock;

      expect(stockAfter).toBe(stockBefore + 2);
    });

    it("should reject refund for non-completed payment", async () => {
      const paid = await paymentService.processPayment({
        orderId,
        userId,
        method: "credit_card",
      });

      await paymentService.refundPayment(paid.data!.id, userId);

      const result = await paymentService.refundPayment(paid.data!.id, userId);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot refund");
    });
  });

  describe("getPaymentByOrderId", () => {
    it("should find payment by order ID", async () => {
      await paymentService.processPayment({
        orderId,
        userId,
        method: "credit_card",
      });

      const result = paymentService.getPaymentByOrderId(orderId, userId);
      expect(result.success).toBe(true);
      expect(result.data!.orderId).toBe(orderId);
    });

    it("should return error when no payment exists for order", () => {
      const result = paymentService.getPaymentByOrderId(orderId, userId);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Payment not found");
    });
  });
});
