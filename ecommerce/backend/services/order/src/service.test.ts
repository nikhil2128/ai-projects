import { describe, it, expect, beforeEach } from "vitest";
import { OrderService } from "./service";
import { OrderStore } from "./store";
import {
  Product,
  Cart,
  ProductServiceClient,
  CartServiceClient,
} from "../../../shared/types";

class MockProductClient implements ProductServiceClient {
  private products: Map<string, Product> = new Map();

  addProduct(product: Product): void {
    this.products.set(product.id, product);
  }

  async getProduct(productId: string): Promise<Product | null> {
    return this.products.get(productId) ?? null;
  }

  async updateStock(productId: string, newStock: number): Promise<boolean> {
    const product = this.products.get(productId);
    if (!product) return false;
    product.stock = newStock;
    return true;
  }
}

class MockCartClient implements CartServiceClient {
  private carts: Map<string, Cart> = new Map();

  setCart(userId: string, cart: Cart): void {
    this.carts.set(userId, cart);
  }

  async getCart(userId: string): Promise<Cart | null> {
    return this.carts.get(userId) ?? null;
  }

  async clearCart(userId: string): Promise<void> {
    const cart = this.carts.get(userId);
    if (cart) {
      cart.items = [];
      cart.updatedAt = new Date();
    }
  }
}

describe("OrderService", () => {
  let orderService: OrderService;
  let productClient: MockProductClient;
  let cartClient: MockCartClient;
  const userId = "user-1";

  const mouseId = "product-mouse";
  const keyboardId = "product-keyboard";

  beforeEach(() => {
    const store = new OrderStore();
    productClient = new MockProductClient();
    cartClient = new MockCartClient();

    productClient.addProduct({
      id: mouseId,
      name: "Wireless Mouse",
      description: "Ergonomic wireless mouse",
      price: 29.99,
      category: "Electronics",
      stock: 10,
      imageUrl: "",
      createdAt: new Date(),
    });
    productClient.addProduct({
      id: keyboardId,
      name: "Gaming Keyboard",
      description: "RGB mechanical keyboard",
      price: 89.99,
      category: "Electronics",
      stock: 5,
      imageUrl: "",
      createdAt: new Date(),
    });

    orderService = new OrderService(store, cartClient, productClient);
  });

  function setupCart(items: { productId: string; name: string; price: number; qty: number }[]) {
    cartClient.setCart(userId, {
      id: "cart-1",
      userId,
      items: items.map((i) => ({
        productId: i.productId,
        productName: i.name,
        price: i.price,
        quantity: i.qty,
      })),
      updatedAt: new Date(),
    });
  }

  describe("createOrder", () => {
    it("should create an order from the user's cart", async () => {
      setupCart([
        { productId: mouseId, name: "Wireless Mouse", price: 29.99, qty: 2 },
        { productId: keyboardId, name: "Gaming Keyboard", price: 89.99, qty: 1 },
      ]);

      const result = await orderService.createOrder({
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

    it("should reduce product stock after order creation", async () => {
      setupCart([
        { productId: mouseId, name: "Wireless Mouse", price: 29.99, qty: 3 },
      ]);

      await orderService.createOrder({
        userId,
        shippingAddress: "123 Main St",
      });

      const product = await productClient.getProduct(mouseId);
      expect(product!.stock).toBe(7);
    });

    it("should clear the cart after order creation", async () => {
      setupCart([
        { productId: mouseId, name: "Wireless Mouse", price: 29.99, qty: 1 },
      ]);

      await orderService.createOrder({
        userId,
        shippingAddress: "123 Main St",
      });

      const cart = await cartClient.getCart(userId);
      expect(cart!.items.length).toBe(0);
    });

    it("should reject order with empty cart", async () => {
      const result = await orderService.createOrder({
        userId,
        shippingAddress: "123 Main St",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cart is empty");
    });

    it("should reject order when product is out of stock", async () => {
      setupCart([
        { productId: mouseId, name: "Wireless Mouse", price: 29.99, qty: 10 },
      ]);

      await productClient.updateStock(mouseId, 2);

      const result = await orderService.createOrder({
        userId,
        shippingAddress: "123 Main St",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Insufficient stock");
    });

    it("should reject order with empty shipping address", async () => {
      setupCart([
        { productId: mouseId, name: "Wireless Mouse", price: 29.99, qty: 1 },
      ]);

      const result = await orderService.createOrder({
        userId,
        shippingAddress: "",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Shipping address is required");
    });
  });

  describe("getOrder", () => {
    it("should retrieve an order by ID", async () => {
      setupCart([
        { productId: mouseId, name: "Wireless Mouse", price: 29.99, qty: 1 },
      ]);

      const created = await orderService.createOrder({
        userId,
        shippingAddress: "123 Main St",
      });

      const result = orderService.getOrder(created.data!.id, userId);
      expect(result.success).toBe(true);
      expect(result.data!.id).toBe(created.data!.id);
    });

    it("should not allow a user to view another user's order", async () => {
      setupCart([
        { productId: mouseId, name: "Wireless Mouse", price: 29.99, qty: 1 },
      ]);

      const created = await orderService.createOrder({
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
    it("should return all orders for a user", async () => {
      setupCart([
        { productId: mouseId, name: "Wireless Mouse", price: 29.99, qty: 1 },
      ]);
      await orderService.createOrder({
        userId,
        shippingAddress: "123 Main St",
      });

      setupCart([
        { productId: mouseId, name: "Wireless Mouse", price: 29.99, qty: 2 },
      ]);
      await orderService.createOrder({
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
    it("should update order status to confirmed", async () => {
      setupCart([
        { productId: mouseId, name: "Wireless Mouse", price: 29.99, qty: 1 },
      ]);

      const created = await orderService.createOrder({
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

    it("should not allow cancelled order to be updated", async () => {
      setupCart([
        { productId: mouseId, name: "Wireless Mouse", price: 29.99, qty: 1 },
      ]);

      const created = await orderService.createOrder({
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
    it("should cancel a pending order and restore stock", async () => {
      setupCart([
        { productId: mouseId, name: "Wireless Mouse", price: 29.99, qty: 3 },
      ]);

      const created = await orderService.createOrder({
        userId,
        shippingAddress: "123 Main St",
      });

      const result = await orderService.cancelOrder(created.data!.id, userId);
      expect(result.success).toBe(true);
      expect(result.data!.status).toBe("cancelled");

      const product = await productClient.getProduct(mouseId);
      expect(product!.stock).toBe(10);
    });

    it("should not cancel a shipped order", async () => {
      setupCart([
        { productId: mouseId, name: "Wireless Mouse", price: 29.99, qty: 1 },
      ]);

      const created = await orderService.createOrder({
        userId,
        shippingAddress: "123 Main St",
      });

      orderService.updateOrderStatus(created.data!.id, "shipped");

      const result = await orderService.cancelOrder(created.data!.id, userId);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot cancel");
    });
  });
});
