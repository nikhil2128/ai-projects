import { describe, it, expect, beforeEach } from "vitest";
import { ProductService } from "./service";
import { ProductStore } from "./store";

describe("ProductService", () => {
  let productService: ProductService;

  beforeEach(() => {
    const store = new ProductStore();
    productService = new ProductService(store);
  });

  describe("createProduct", () => {
    it("should create a product successfully", () => {
      const result = productService.createProduct({
        name: "Wireless Mouse",
        description: "Ergonomic wireless mouse",
        price: 29.99,
        category: "Electronics",
        stock: 100,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.name).toBe("Wireless Mouse");
      expect(result.data!.price).toBe(29.99);
      expect(result.data!.id).toBeDefined();
    });

    it("should reject product with negative price", () => {
      const result = productService.createProduct({
        name: "Bad Product",
        description: "Has negative price",
        price: -10,
        category: "Electronics",
        stock: 5,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Price must be positive");
    });

    it("should reject product with negative stock", () => {
      const result = productService.createProduct({
        name: "Bad Product",
        description: "Has negative stock",
        price: 10,
        category: "Electronics",
        stock: -5,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Stock cannot be negative");
    });

    it("should reject product with empty name", () => {
      const result = productService.createProduct({
        name: "",
        description: "No name product",
        price: 10,
        category: "Electronics",
        stock: 5,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Product name is required");
    });
  });

  describe("getProductById", () => {
    it("should return a product by its ID", () => {
      const created = productService.createProduct({
        name: "Keyboard",
        description: "Mechanical keyboard",
        price: 79.99,
        category: "Electronics",
        stock: 50,
      });

      const result = productService.getProductById(created.data!.id);
      expect(result.success).toBe(true);
      expect(result.data!.name).toBe("Keyboard");
    });

    it("should return error for non-existent product", () => {
      const result = productService.getProductById("non-existent-id");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Product not found");
    });
  });

  describe("searchProducts", () => {
    beforeEach(() => {
      productService.createProduct({
        name: "Wireless Mouse",
        description: "Ergonomic wireless mouse with USB receiver",
        price: 29.99,
        category: "Electronics",
        stock: 100,
      });
      productService.createProduct({
        name: "Gaming Keyboard",
        description: "RGB mechanical gaming keyboard",
        price: 89.99,
        category: "Electronics",
        stock: 50,
      });
      productService.createProduct({
        name: "Cotton T-Shirt",
        description: "Comfortable cotton t-shirt",
        price: 19.99,
        category: "Clothing",
        stock: 200,
      });
      productService.createProduct({
        name: "Running Shoes",
        description: "Lightweight running shoes",
        price: 59.99,
        category: "Clothing",
        stock: 75,
      });
    });

    it("should return all products when no filters given", () => {
      const result = productService.searchProducts({});
      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(4);
    });

    it("should search products by keyword in name", () => {
      const result = productService.searchProducts({ keyword: "mouse" });
      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(1);
      expect(result.data![0].name).toBe("Wireless Mouse");
    });

    it("should search products by keyword in description", () => {
      const result = productService.searchProducts({ keyword: "mechanical" });
      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(1);
      expect(result.data![0].name).toBe("Gaming Keyboard");
    });

    it("should search products by keyword case-insensitively", () => {
      const result = productService.searchProducts({ keyword: "WIRELESS" });
      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(1);
    });

    it("should filter products by category", () => {
      const result = productService.searchProducts({
        category: "Clothing",
      });
      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(2);
    });

    it("should filter products by price range", () => {
      const result = productService.searchProducts({
        minPrice: 25,
        maxPrice: 60,
      });
      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(2);
      expect(result.data!.map((p) => p.name).sort()).toEqual([
        "Running Shoes",
        "Wireless Mouse",
      ]);
    });

    it("should combine keyword and category filters", () => {
      const result = productService.searchProducts({
        keyword: "keyboard",
        category: "Electronics",
      });
      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(1);
      expect(result.data![0].name).toBe("Gaming Keyboard");
    });

    it("should return empty array when no products match", () => {
      const result = productService.searchProducts({
        keyword: "nonexistent",
      });
      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(0);
    });
  });

  describe("updateStock", () => {
    it("should update product stock", () => {
      const created = productService.createProduct({
        name: "Headphones",
        description: "Noise cancelling headphones",
        price: 199.99,
        category: "Electronics",
        stock: 30,
      });

      const result = productService.updateStock(created.data!.id, 25);
      expect(result.success).toBe(true);
      expect(result.data!.stock).toBe(25);
    });

    it("should reject negative stock update", () => {
      const created = productService.createProduct({
        name: "Headphones",
        description: "Noise cancelling headphones",
        price: 199.99,
        category: "Electronics",
        stock: 30,
      });

      const result = productService.updateStock(created.data!.id, -5);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Stock cannot be negative");
    });
  });
});
