import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import { CartService } from "./service";
import { CartStore } from "./store";
import { Product, ProductServiceClient } from "../../../shared/types";
import { getTestPool, cleanTables, closeTestPool } from "../../../shared/test-db";

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

describe("CartService", () => {
  let cartService: CartService;
  let productClient: MockProductClient;
  let pool: Pool;
  const userId = "user-1";

  let mouseId: string;
  let keyboardId: string;

  beforeAll(async () => {
    pool = await getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await cleanTables(pool);
    const store = new CartStore(pool);
    productClient = new MockProductClient();

    mouseId = "product-mouse";
    keyboardId = "product-keyboard";

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

    cartService = new CartService(store, productClient);
  });

  describe("addToCart", () => {
    it("should add a product to an empty cart", async () => {
      const result = await cartService.addToCart(userId, mouseId, 2);

      expect(result.success).toBe(true);
      expect(result.data!.items.length).toBe(1);
      expect(result.data!.items[0].productId).toBe(mouseId);
      expect(result.data!.items[0].quantity).toBe(2);
      expect(result.data!.items[0].price).toBe(29.99);
    });

    it("should increase quantity when adding existing product", async () => {
      await cartService.addToCart(userId, mouseId, 2);
      const result = await cartService.addToCart(userId, mouseId, 3);

      expect(result.success).toBe(true);
      expect(result.data!.items.length).toBe(1);
      expect(result.data!.items[0].quantity).toBe(5);
    });

    it("should add multiple different products to cart", async () => {
      await cartService.addToCart(userId, mouseId, 1);
      const result = await cartService.addToCart(userId, keyboardId, 1);

      expect(result.success).toBe(true);
      expect(result.data!.items.length).toBe(2);
    });

    it("should reject adding more than available stock", async () => {
      const result = await cartService.addToCart(userId, mouseId, 15);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Insufficient stock");
    });

    it("should reject adding non-existent product", async () => {
      const result = await cartService.addToCart(userId, "fake-id", 1);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Product not found");
    });

    it("should reject adding zero or negative quantity", async () => {
      const result = await cartService.addToCart(userId, mouseId, 0);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Quantity must be at least 1");
    });
  });

  describe("removeFromCart", () => {
    it("should remove a product from the cart", async () => {
      await cartService.addToCart(userId, mouseId, 1);
      await cartService.addToCart(userId, keyboardId, 1);

      const result = await cartService.removeFromCart(userId, mouseId);
      expect(result.success).toBe(true);
      expect(result.data!.items.length).toBe(1);
      expect(result.data!.items[0].productId).toBe(keyboardId);
    });

    it("should return error when removing non-existent cart item", async () => {
      const result = await cartService.removeFromCart(userId, "fake-id");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found in cart");
    });
  });

  describe("updateCartItemQuantity", () => {
    it("should update quantity of an item in the cart", async () => {
      await cartService.addToCart(userId, mouseId, 2);

      const result = await cartService.updateCartItemQuantity(
        userId,
        mouseId,
        5
      );
      expect(result.success).toBe(true);
      expect(result.data!.items[0].quantity).toBe(5);
    });

    it("should reject quantity exceeding stock", async () => {
      await cartService.addToCart(userId, mouseId, 2);

      const result = await cartService.updateCartItemQuantity(
        userId,
        mouseId,
        15
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain("Insufficient stock");
    });

    it("should remove item when quantity set to 0", async () => {
      await cartService.addToCart(userId, mouseId, 2);

      const result = await cartService.updateCartItemQuantity(
        userId,
        mouseId,
        0
      );
      expect(result.success).toBe(true);
      expect(result.data!.items.length).toBe(0);
    });
  });

  describe("getCart", () => {
    it("should return the user's cart", async () => {
      await cartService.addToCart(userId, mouseId, 3);

      const result = await cartService.getCart(userId);
      expect(result.success).toBe(true);
      expect(result.data!.userId).toBe(userId);
      expect(result.data!.items.length).toBe(1);
    });

    it("should return an empty cart for a new user", async () => {
      const result = await cartService.getCart("new-user");
      expect(result.success).toBe(true);
      expect(result.data!.items.length).toBe(0);
    });
  });

  describe("clearCart", () => {
    it("should clear all items from the cart", async () => {
      await cartService.addToCart(userId, mouseId, 1);
      await cartService.addToCart(userId, keyboardId, 1);

      const result = await cartService.clearCart(userId);
      expect(result.success).toBe(true);
      expect(result.data!.items.length).toBe(0);
    });
  });

  describe("getCartTotal", () => {
    it("should calculate the correct cart total", async () => {
      await cartService.addToCart(userId, mouseId, 2);
      await cartService.addToCart(userId, keyboardId, 1);

      const total = await cartService.getCartTotal(userId);
      expect(total).toBeCloseTo(29.99 * 2 + 89.99, 2);
    });

    it("should return 0 for an empty cart", async () => {
      const total = await cartService.getCartTotal("new-user");
      expect(total).toBe(0);
    });
  });
});
