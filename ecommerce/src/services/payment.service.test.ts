import { describe, it, expect, beforeEach } from "vitest";
import { PaymentService } from "./payment.service";
import { OrderService } from "./order.service";
import { CartService } from "./cart.service";
import { ProductService } from "./product.service";
import { InMemoryStore } from "../store/in-memory-store";

describe("PaymentService", () => {
  let paymentService: PaymentService;
  let orderService: OrderService;
  let cartService: CartService;
  let productService: ProductService;
  let store: InMemoryStore;
  const userId = "user-1";
  let orderId: string;

  beforeEach(() => {
    store = new InMemoryStore();
    productService = new ProductService(store);
    cartService = new CartService(store);
    orderService = new OrderService(store);
    paymentService = new PaymentService(store);

    productService.createProduct({
      name: "Wireless Mouse",
      description: "Ergonomic wireless mouse",
      price: 29.99,
      category: "Electronics",
      stock: 10,
    });

    const mouseId = productService.searchProducts({ keyword: "Mouse" })
      .data![0].id;
    cartService.addToCart(userId, mouseId, 2);

    const order = orderService.createOrder({
      userId,
      shippingAddress: "123 Main St, City",
    });
    orderId = order.data!.id;
  });

  describe("processPayment", () => {
    it("should process payment for an order", () => {
      const result = paymentService.processPayment({
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

    it("should update order status to confirmed after payment", () => {
      paymentService.processPayment({
        orderId,
        userId,
        method: "credit_card",
      });

      const order = orderService.getOrder(orderId, userId);
      expect(order.data!.status).toBe("confirmed");
      expect(order.data!.paymentId).toBeDefined();
    });

    it("should reject payment for non-existent order", () => {
      const result = paymentService.processPayment({
        orderId: "fake-order-id",
        userId,
        method: "credit_card",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Order not found");
    });

    it("should reject payment for another user's order", () => {
      const result = paymentService.processPayment({
        orderId,
        userId: "other-user",
        method: "credit_card",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Order not found");
    });

    it("should reject duplicate payment for same order", () => {
      paymentService.processPayment({
        orderId,
        userId,
        method: "credit_card",
      });

      const result = paymentService.processPayment({
        orderId,
        userId,
        method: "credit_card",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("already been paid");
    });

    it("should reject payment for cancelled order", () => {
      orderService.cancelOrder(orderId, userId);

      const result = paymentService.processPayment({
        orderId,
        userId,
        method: "credit_card",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot pay for");
    });

    it("should support different payment methods", () => {
      const result = paymentService.processPayment({
        orderId,
        userId,
        method: "paypal",
      });

      expect(result.success).toBe(true);
      expect(result.data!.method).toBe("paypal");
    });
  });

  describe("getPayment", () => {
    it("should retrieve payment by ID", () => {
      const paid = paymentService.processPayment({
        orderId,
        userId,
        method: "credit_card",
      });

      const result = paymentService.getPayment(paid.data!.id, userId);
      expect(result.success).toBe(true);
      expect(result.data!.id).toBe(paid.data!.id);
    });

    it("should not allow viewing another user's payment", () => {
      const paid = paymentService.processPayment({
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
    it("should refund a completed payment", () => {
      const paid = paymentService.processPayment({
        orderId,
        userId,
        method: "credit_card",
      });

      const result = paymentService.refundPayment(paid.data!.id, userId);
      expect(result.success).toBe(true);
      expect(result.data!.status).toBe("refunded");
    });

    it("should update order status to cancelled on refund", () => {
      const paid = paymentService.processPayment({
        orderId,
        userId,
        method: "credit_card",
      });

      paymentService.refundPayment(paid.data!.id, userId);

      const order = orderService.getOrder(orderId, userId);
      expect(order.data!.status).toBe("cancelled");
    });

    it("should restore product stock on refund", () => {
      const mouseId = productService.searchProducts({ keyword: "Mouse" })
        .data![0].id;

      const paid = paymentService.processPayment({
        orderId,
        userId,
        method: "credit_card",
      });

      const stockBefore = productService.getProductById(mouseId).data!.stock;
      paymentService.refundPayment(paid.data!.id, userId);
      const stockAfter = productService.getProductById(mouseId).data!.stock;

      expect(stockAfter).toBe(stockBefore + 2);
    });

    it("should reject refund for non-completed payment", () => {
      const paid = paymentService.processPayment({
        orderId,
        userId,
        method: "credit_card",
      });

      paymentService.refundPayment(paid.data!.id, userId);

      const result = paymentService.refundPayment(paid.data!.id, userId);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot refund");
    });
  });

  describe("getPaymentByOrderId", () => {
    it("should find payment by order ID", () => {
      paymentService.processPayment({
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
