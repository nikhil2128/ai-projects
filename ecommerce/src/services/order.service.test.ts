import { describe, it, expect, beforeEach } from "vitest";
import { OrderService } from "./order.service";
import { CartService } from "./cart.service";
import { ProductService } from "./product.service";
import { InMemoryStore } from "../store/in-memory-store";

describe("OrderService", () => {
  let orderService: OrderService;
  let cartService: CartService;
  let productService: ProductService;
  let store: InMemoryStore;
  const userId = "user-1";

  beforeEach(() => {
    store = new InMemoryStore();
    productService = new ProductService(store);
    cartService = new CartService(store);
    orderService = new OrderService(store);

    productService.createProduct({
      name: "Wireless Mouse",
      description: "Ergonomic wireless mouse",
      price: 29.99,
      category: "Electronics",
      stock: 10,
    });
    productService.createProduct({
      name: "Gaming Keyboard",
      description: "RGB mechanical keyboard",
      price: 89.99,
      category: "Electronics",
      stock: 5,
    });
  });

  function getProductId(name: string): string {
    const result = productService.searchProducts({ keyword: name });
    return result.data![0].id;
  }

  describe("createOrder", () => {
    it("should create an order from the user's cart", () => {
      const mouseId = getProductId("Mouse");
      const keyboardId = getProductId("Keyboard");

      cartService.addToCart(userId, mouseId, 2);
      cartService.addToCart(userId, keyboardId, 1);

      const result = orderService.createOrder({
        userId,
        shippingAddress: "123 Main St, City",
      });

      expect(result.success).toBe(true);
      expect(result.data!.items.length).toBe(2);
      expect(result.data!.totalAmount).toBeCloseTo(29.99 * 2 + 89.99, 2);
      expect(result.data!.status).toBe("pending");
      expect(result.data!.shippingAddress).toBe("123 Main St, City");
      expect(result.data!.id).toBeDefined();
    });

    it("should reduce product stock after order creation", () => {
      const mouseId = getProductId("Mouse");
      cartService.addToCart(userId, mouseId, 3);

      orderService.createOrder({
        userId,
        shippingAddress: "123 Main St",
      });

      const product = productService.getProductById(mouseId);
      expect(product.data!.stock).toBe(7);
    });

    it("should clear the cart after order creation", () => {
      const mouseId = getProductId("Mouse");
      cartService.addToCart(userId, mouseId, 1);

      orderService.createOrder({
        userId,
        shippingAddress: "123 Main St",
      });

      const cart = cartService.getCart(userId);
      expect(cart.data!.items.length).toBe(0);
    });

    it("should reject order with empty cart", () => {
      const result = orderService.createOrder({
        userId,
        shippingAddress: "123 Main St",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cart is empty");
    });

    it("should reject order when product is out of stock", () => {
      const mouseId = getProductId("Mouse");
      cartService.addToCart(userId, mouseId, 10);

      productService.updateStock(mouseId, 2);

      const result = orderService.createOrder({
        userId,
        shippingAddress: "123 Main St",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Insufficient stock");
    });

    it("should reject order with empty shipping address", () => {
      const mouseId = getProductId("Mouse");
      cartService.addToCart(userId, mouseId, 1);

      const result = orderService.createOrder({
        userId,
        shippingAddress: "",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Shipping address is required");
    });
  });

  describe("getOrder", () => {
    it("should retrieve an order by ID", () => {
      const mouseId = getProductId("Mouse");
      cartService.addToCart(userId, mouseId, 1);

      const created = orderService.createOrder({
        userId,
        shippingAddress: "123 Main St",
      });

      const result = orderService.getOrder(created.data!.id, userId);
      expect(result.success).toBe(true);
      expect(result.data!.id).toBe(created.data!.id);
    });

    it("should not allow a user to view another user's order", () => {
      const mouseId = getProductId("Mouse");
      cartService.addToCart(userId, mouseId, 1);

      const created = orderService.createOrder({
        userId,
        shippingAddress: "123 Main St",
      });

      const result = orderService.getOrder(created.data!.id, "other-user");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Order not found");
    });

    it("should return error for non-existent order", () => {
      const result = orderService.getOrder("fake-id", userId);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Order not found");
    });
  });

  describe("getUserOrders", () => {
    it("should return all orders for a user", () => {
      const mouseId = getProductId("Mouse");

      cartService.addToCart(userId, mouseId, 1);
      orderService.createOrder({
        userId,
        shippingAddress: "123 Main St",
      });

      cartService.addToCart(userId, mouseId, 2);
      orderService.createOrder({
        userId,
        shippingAddress: "456 Oak Ave",
      });

      const result = orderService.getUserOrders(userId);
      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(2);
    });

    it("should return empty array for user with no orders", () => {
      const result = orderService.getUserOrders("new-user");
      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(0);
    });
  });

  describe("updateOrderStatus", () => {
    it("should update order status to confirmed", () => {
      const mouseId = getProductId("Mouse");
      cartService.addToCart(userId, mouseId, 1);

      const created = orderService.createOrder({
        userId,
        shippingAddress: "123 Main St",
      });

      const result = orderService.updateOrderStatus(
        created.data!.id,
        "confirmed"
      );
      expect(result.success).toBe(true);
      expect(result.data!.status).toBe("confirmed");
    });

    it("should not allow cancelled order to be updated", () => {
      const mouseId = getProductId("Mouse");
      cartService.addToCart(userId, mouseId, 1);

      const created = orderService.createOrder({
        userId,
        shippingAddress: "123 Main St",
      });

      orderService.updateOrderStatus(created.data!.id, "cancelled");

      const result = orderService.updateOrderStatus(
        created.data!.id,
        "confirmed"
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot update cancelled order");
    });
  });

  describe("cancelOrder", () => {
    it("should cancel a pending order and restore stock", () => {
      const mouseId = getProductId("Mouse");
      cartService.addToCart(userId, mouseId, 3);

      const created = orderService.createOrder({
        userId,
        shippingAddress: "123 Main St",
      });

      const result = orderService.cancelOrder(created.data!.id, userId);
      expect(result.success).toBe(true);
      expect(result.data!.status).toBe("cancelled");

      const product = productService.getProductById(mouseId);
      expect(product.data!.stock).toBe(10);
    });

    it("should not cancel a shipped order", () => {
      const mouseId = getProductId("Mouse");
      cartService.addToCart(userId, mouseId, 1);

      const created = orderService.createOrder({
        userId,
        shippingAddress: "123 Main St",
      });

      orderService.updateOrderStatus(created.data!.id, "shipped");

      const result = orderService.cancelOrder(created.data!.id, userId);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot cancel");
    });
  });
});
