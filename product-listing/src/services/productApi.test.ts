import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  clearProductApiCache,
  fetchProducts,
  fetchProductsByCategory,
  searchProducts,
  fetchCategories,
} from "./productApi";

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  clearProductApiCache();
});

describe("productApi", () => {
  describe("fetchProducts", () => {
    it("fetches products with default params", async () => {
      const mockResponse = { products: [], total: 0, skip: 0, limit: 10 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await fetchProducts();

      expect(mockFetch).toHaveBeenCalledOnce();
      const url = new URL(mockFetch.mock.calls[0][0]);
      expect(url.pathname).toBe("/products");
      expect(url.searchParams.get("limit")).toBe("10");
      expect(url.searchParams.get("skip")).toBe("0");
      expect(url.searchParams.get("select")).toContain("id,title");
      expect(result).toEqual(mockResponse);
    });

    it("fetches products with custom params", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ products: [], total: 0, skip: 20, limit: 5 }),
      });

      await fetchProducts(5, 20);

      const url = new URL(mockFetch.mock.calls[0][0]);
      expect(url.searchParams.get("limit")).toBe("5");
      expect(url.searchParams.get("skip")).toBe("20");
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      await expect(fetchProducts()).rejects.toThrow("Failed to fetch products: 500");
    });

    it("reuses cached product responses", async () => {
      const mockResponse = { products: [], total: 0, skip: 0, limit: 10 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await fetchProducts();
      await fetchProducts();

      expect(mockFetch).toHaveBeenCalledOnce();
    });
  });

  describe("fetchProductsByCategory", () => {
    it("fetches products by category", async () => {
      const mockResponse = { products: [], total: 0, skip: 0, limit: 10 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await fetchProductsByCategory("smartphones");

      const url = new URL(mockFetch.mock.calls[0][0]);
      expect(url.pathname).toBe("/products/category/smartphones");
      expect(result).toEqual(mockResponse);
    });

    it("encodes special characters in category", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ products: [], total: 0, skip: 0, limit: 10 }),
      });

      await fetchProductsByCategory("home & garden");

      const url = new URL(mockFetch.mock.calls[0][0]);
      expect(url.pathname).toContain("home%20%26%20garden");
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      await expect(fetchProductsByCategory("bad")).rejects.toThrow(
        "Failed to fetch category products: 404",
      );
    });
  });

  describe("searchProducts", () => {
    it("searches products with query", async () => {
      const mockResponse = { products: [], total: 0, skip: 0, limit: 10 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await searchProducts("phone");

      const url = new URL(mockFetch.mock.calls[0][0]);
      expect(url.pathname).toBe("/products/search");
      expect(url.searchParams.get("q")).toBe("phone");
      expect(result).toEqual(mockResponse);
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });

      await expect(searchProducts("phone")).rejects.toThrow(
        "Failed to search products: 503",
      );
    });
  });

  describe("fetchCategories", () => {
    it("fetches and normalizes string categories", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(["smartphones", "home-decoration"]),
      });

      const result = await fetchCategories();

      expect(result).toEqual([
        { slug: "smartphones", name: "Smartphones" },
        { slug: "home-decoration", name: "Home Decoration" },
      ]);
    });

    it("fetches and normalizes object categories", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { slug: "smartphones", name: "Smartphones", url: "https://..." },
            { slug: "laptops", name: "Laptops" },
          ]),
      });

      const result = await fetchCategories();

      expect(result).toEqual([
        { slug: "smartphones", name: "Smartphones" },
        { slug: "laptops", name: "Laptops" },
      ]);
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      await expect(fetchCategories()).rejects.toThrow("Failed to fetch categories: 500");
    });
  });
});
