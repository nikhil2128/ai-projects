import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import { ProductService } from "./service";
import { ProductStore } from "./store";
import { getTestPool, cleanTables, closeTestPool } from "../../../shared/test-db";

describe("ProductService", () => {
  let productService: ProductService;
  let pool: Pool;

  beforeAll(async () => {
    pool = await getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await cleanTables(pool);
    const store = new ProductStore(pool);
    productService = new ProductService(store);
  });

  describe("createProduct", () => {
    it("should create a product successfully", async () => {
      const result = await productService.createProduct({
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

    it("should reject product with negative price", async () => {
      const result = await productService.createProduct({
        name: "Bad Product",
        description: "Has negative price",
        price: -10,
        category: "Electronics",
        stock: 5,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Price must be positive");
    });

    it("should reject product with negative stock", async () => {
      const result = await productService.createProduct({
        name: "Bad Product",
        description: "Has negative stock",
        price: 10,
        category: "Electronics",
        stock: -5,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Stock cannot be negative");
    });

    it("should reject product with empty name", async () => {
      const result = await productService.createProduct({
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
    it("should return a product by its ID", async () => {
      const created = await productService.createProduct({
        name: "Keyboard",
        description: "Mechanical keyboard",
        price: 79.99,
        category: "Electronics",
        stock: 50,
      });

      const result = await productService.getProductById(created.data!.id);
      expect(result.success).toBe(true);
      expect(result.data!.name).toBe("Keyboard");
    });

    it("should return error for non-existent product", async () => {
      const result = await productService.getProductById("non-existent-id");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Product not found");
    });
  });

  describe("searchProducts", () => {
    beforeEach(async () => {
      await productService.createProduct({
        name: "Wireless Mouse",
        description: "Ergonomic wireless mouse with USB receiver",
        price: 29.99,
        category: "Electronics",
        stock: 100,
      });
      await productService.createProduct({
        name: "Gaming Keyboard",
        description: "RGB mechanical gaming keyboard",
        price: 89.99,
        category: "Electronics",
        stock: 50,
      });
      await productService.createProduct({
        name: "Cotton T-Shirt",
        description: "Comfortable cotton t-shirt",
        price: 19.99,
        category: "Clothing",
        stock: 200,
      });
      await productService.createProduct({
        name: "Running Shoes",
        description: "Lightweight running shoes",
        price: 59.99,
        category: "Clothing",
        stock: 75,
      });
    });

    it("should return all products when no filters given", async () => {
      const result = await productService.searchProducts({});
      expect(result.success).toBe(true);
      expect(result.data!.data.length).toBe(4);
      expect(result.data!.total).toBe(4);
    });

    it("should search products by keyword in name", async () => {
      const result = await productService.searchProducts({ keyword: "mouse" });
      expect(result.success).toBe(true);
      expect(result.data!.data.length).toBe(1);
      expect(result.data!.data[0].name).toBe("Wireless Mouse");
    });

    it("should search products by keyword in description", async () => {
      const result = await productService.searchProducts({ keyword: "mechanical" });
      expect(result.success).toBe(true);
      expect(result.data!.data.length).toBe(1);
      expect(result.data!.data[0].name).toBe("Gaming Keyboard");
    });

    it("should search products by keyword case-insensitively", async () => {
      const result = await productService.searchProducts({ keyword: "WIRELESS" });
      expect(result.success).toBe(true);
      expect(result.data!.data.length).toBe(1);
    });

    it("should filter products by category", async () => {
      const result = await productService.searchProducts({
        category: "Clothing",
      });
      expect(result.success).toBe(true);
      expect(result.data!.data.length).toBe(2);
    });

    it("should filter products by price range", async () => {
      const result = await productService.searchProducts({
        minPrice: 25,
        maxPrice: 60,
      });
      expect(result.success).toBe(true);
      expect(result.data!.data.length).toBe(2);
      expect(result.data!.data.map((p) => p.name).sort()).toEqual([
        "Running Shoes",
        "Wireless Mouse",
      ]);
    });

    it("should combine keyword and category filters", async () => {
      const result = await productService.searchProducts({
        keyword: "keyboard",
        category: "Electronics",
      });
      expect(result.success).toBe(true);
      expect(result.data!.data.length).toBe(1);
      expect(result.data!.data[0].name).toBe("Gaming Keyboard");
    });

    it("should return empty array when no products match", async () => {
      const result = await productService.searchProducts({
        keyword: "nonexistent",
      });
      expect(result.success).toBe(true);
      expect(result.data!.data.length).toBe(0);
    });
  });

  describe("updateStock", () => {
    it("should update product stock", async () => {
      const created = await productService.createProduct({
        name: "Headphones",
        description: "Noise cancelling headphones",
        price: 199.99,
        category: "Electronics",
        stock: 30,
      });

      const result = await productService.updateStock(created.data!.id, 25);
      expect(result.success).toBe(true);
      expect(result.data!.stock).toBe(25);
    });

    it("should reject negative stock update", async () => {
      const created = await productService.createProduct({
        name: "Headphones",
        description: "Noise cancelling headphones",
        price: 199.99,
        category: "Electronics",
        stock: 30,
      });

      const result = await productService.updateStock(created.data!.id, -5);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Stock cannot be negative");
    });
  });
});
