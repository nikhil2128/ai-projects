import { describe, it, expect, beforeEach } from "vitest";
import { CartService } from "./cart.service";
import { ProductService } from "./product.service";
import { InMemoryStore } from "../store/in-memory-store";

describe("CartService", () => {
  let cartService: CartService;
  let productService: ProductService;
  let store: InMemoryStore;
  const userId = "user-1";

  beforeEach(() => {
    store = new InMemoryStore();
    productService = new ProductService(store);
    cartService = new CartService(store);

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

  describe("addToCart", () => {
    it("should add a product to an empty cart", () => {
      const mouseId = getProductId("Mouse");
      const result = cartService.addToCart(userId, mouseId, 2);

      expect(result.success).toBe(true);
      expect(result.data!.items.length).toBe(1);
      expect(result.data!.items[0].productId).toBe(mouseId);
      expect(result.data!.items[0].quantity).toBe(2);
      expect(result.data!.items[0].price).toBe(29.99);
    });

    it("should increase quantity when adding existing product", () => {
      const mouseId = getProductId("Mouse");
      cartService.addToCart(userId, mouseId, 2);
      const result = cartService.addToCart(userId, mouseId, 3);

      expect(result.success).toBe(true);
      expect(result.data!.items.length).toBe(1);
      expect(result.data!.items[0].quantity).toBe(5);
    });

    it("should add multiple different products to cart", () => {
      const mouseId = getProductId("Mouse");
      const keyboardId = getProductId("Keyboard");

      cartService.addToCart(userId, mouseId, 1);
      const result = cartService.addToCart(userId, keyboardId, 1);

      expect(result.success).toBe(true);
      expect(result.data!.items.length).toBe(2);
    });

    it("should reject adding more than available stock", () => {
      const mouseId = getProductId("Mouse");
      const result = cartService.addToCart(userId, mouseId, 15);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Insufficient stock");
    });

    it("should reject adding non-existent product", () => {
      const result = cartService.addToCart(userId, "fake-id", 1);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Product not found");
    });

    it("should reject adding zero or negative quantity", () => {
      const mouseId = getProductId("Mouse");
      const result = cartService.addToCart(userId, mouseId, 0);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Quantity must be at least 1");
    });
  });

  describe("removeFromCart", () => {
    it("should remove a product from the cart", () => {
      const mouseId = getProductId("Mouse");
      const keyboardId = getProductId("Keyboard");

      cartService.addToCart(userId, mouseId, 1);
      cartService.addToCart(userId, keyboardId, 1);

      const result = cartService.removeFromCart(userId, mouseId);
      expect(result.success).toBe(true);
      expect(result.data!.items.length).toBe(1);
      expect(result.data!.items[0].productId).toBe(keyboardId);
    });

    it("should return error when removing non-existent cart item", () => {
      const result = cartService.removeFromCart(userId, "fake-id");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found in cart");
    });
  });

  describe("updateCartItemQuantity", () => {
    it("should update quantity of an item in the cart", () => {
      const mouseId = getProductId("Mouse");
      cartService.addToCart(userId, mouseId, 2);

      const result = cartService.updateCartItemQuantity(userId, mouseId, 5);
      expect(result.success).toBe(true);
      expect(result.data!.items[0].quantity).toBe(5);
    });

    it("should reject quantity exceeding stock", () => {
      const mouseId = getProductId("Mouse");
      cartService.addToCart(userId, mouseId, 2);

      const result = cartService.updateCartItemQuantity(userId, mouseId, 15);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Insufficient stock");
    });

    it("should remove item when quantity set to 0", () => {
      const mouseId = getProductId("Mouse");
      cartService.addToCart(userId, mouseId, 2);

      const result = cartService.updateCartItemQuantity(userId, mouseId, 0);
      expect(result.success).toBe(true);
      expect(result.data!.items.length).toBe(0);
    });
  });

  describe("getCart", () => {
    it("should return the user's cart", () => {
      const mouseId = getProductId("Mouse");
      cartService.addToCart(userId, mouseId, 3);

      const result = cartService.getCart(userId);
      expect(result.success).toBe(true);
      expect(result.data!.userId).toBe(userId);
      expect(result.data!.items.length).toBe(1);
    });

    it("should return an empty cart for a new user", () => {
      const result = cartService.getCart("new-user");
      expect(result.success).toBe(true);
      expect(result.data!.items.length).toBe(0);
    });
  });

  describe("clearCart", () => {
    it("should clear all items from the cart", () => {
      const mouseId = getProductId("Mouse");
      const keyboardId = getProductId("Keyboard");

      cartService.addToCart(userId, mouseId, 1);
      cartService.addToCart(userId, keyboardId, 1);

      const result = cartService.clearCart(userId);
      expect(result.success).toBe(true);
      expect(result.data!.items.length).toBe(0);
    });
  });

  describe("getCartTotal", () => {
    it("should calculate the correct cart total", () => {
      const mouseId = getProductId("Mouse");
      const keyboardId = getProductId("Keyboard");

      cartService.addToCart(userId, mouseId, 2);
      cartService.addToCart(userId, keyboardId, 1);

      const total = cartService.getCartTotal(userId);
      expect(total).toBeCloseTo(29.99 * 2 + 89.99, 2);
    });

    it("should return 0 for an empty cart", () => {
      const total = cartService.getCartTotal("new-user");
      expect(total).toBe(0);
    });
  });
});
