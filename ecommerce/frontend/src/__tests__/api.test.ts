import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api, ApiError } from "../api";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

describe("API client", () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch.mockReset();
  });

  describe("auth", () => {
    it("login sends POST with credentials", async () => {
      mockFetch.mockReturnValue(
        jsonResponse({ token: "t1", userId: "u1", email: "a@b.com" })
      );

      const result = await api.auth.login("a@b.com", "pass");
      expect(result.token).toBe("t1");
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/auth/login",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "a@b.com", password: "pass" }),
        })
      );
    });

    it("register sends POST with user data", async () => {
      mockFetch.mockReturnValue(
        jsonResponse({ id: "u1", email: "a@b.com", name: "Test" })
      );

      const result = await api.auth.register("a@b.com", "Test", "password");
      expect(result.id).toBe("u1");
    });
  });

  describe("products", () => {
    it("list fetches products with query params", async () => {
      mockFetch.mockReturnValue(
        jsonResponse({ data: [], total: 0, page: 1, limit: 24, totalPages: 0 })
      );

      await api.products.list({ keyword: "phone", category: "Electronics", page: 2 });
      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("keyword=phone");
      expect(url).toContain("category=Electronics");
      expect(url).toContain("page=2");
    });

    it("list works without params", async () => {
      mockFetch.mockReturnValue(
        jsonResponse({ data: [], total: 0, page: 1, limit: 24, totalPages: 0 })
      );

      await api.products.list();
      expect(mockFetch.mock.calls[0][0]).toBe("/api/products");
    });

    it("get fetches single product", async () => {
      mockFetch.mockReturnValue(
        jsonResponse({ id: "p1", name: "Widget", price: 9.99 })
      );

      const product = await api.products.get("p1");
      expect(product.id).toBe("p1");
      expect(mockFetch.mock.calls[0][0]).toBe("/api/products/p1");
    });
  });

  describe("cart", () => {
    it("get fetches cart", async () => {
      mockFetch.mockReturnValue(
        jsonResponse({ id: "c1", userId: "u1", items: [], updatedAt: "" })
      );

      const cart = await api.cart.get();
      expect(cart.id).toBe("c1");
    });

    it("addItem sends POST", async () => {
      mockFetch.mockReturnValue(
        jsonResponse({ id: "c1", userId: "u1", items: [], updatedAt: "" })
      );

      await api.cart.addItem("p1", 2);
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/cart/items",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ productId: "p1", quantity: 2 }),
        })
      );
    });

    it("updateItem sends PUT", async () => {
      mockFetch.mockReturnValue(
        jsonResponse({ id: "c1", userId: "u1", items: [], updatedAt: "" })
      );

      await api.cart.updateItem("p1", 5);
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/cart/items/p1",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ quantity: 5 }),
        })
      );
    });

    it("removeItem sends DELETE", async () => {
      mockFetch.mockReturnValue(
        jsonResponse({ id: "c1", userId: "u1", items: [], updatedAt: "" })
      );

      await api.cart.removeItem("p1");
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/cart/items/p1",
        expect.objectContaining({ method: "DELETE" })
      );
    });

    it("clear sends DELETE to /api/cart", async () => {
      mockFetch.mockReturnValue(
        jsonResponse({ id: "c1", userId: "u1", items: [], updatedAt: "" })
      );

      await api.cart.clear();
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/cart",
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  describe("orders", () => {
    it("create sends POST with shipping address", async () => {
      mockFetch.mockReturnValue(jsonResponse({ id: "o1" }));

      await api.orders.create("123 Main St");
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/orders",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ shippingAddress: "123 Main St" }),
        })
      );
    });

    it("list fetches all orders", async () => {
      mockFetch.mockReturnValue(jsonResponse([]));
      await api.orders.list();
      expect(mockFetch.mock.calls[0][0]).toBe("/api/orders");
    });

    it("cancel sends POST to cancel endpoint", async () => {
      mockFetch.mockReturnValue(jsonResponse({ id: "o1", status: "cancelled" }));
      await api.orders.cancel("o1");
      expect(mockFetch.mock.calls[0][0]).toBe("/api/orders/o1/cancel");
    });
  });

  describe("payments", () => {
    it("process sends POST with order and method", async () => {
      mockFetch.mockReturnValue(jsonResponse({ id: "pay1" }));

      await api.payments.process("o1", "credit_card");
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/payments",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ orderId: "o1", method: "credit_card" }),
        })
      );
    });

    it("refund sends POST to refund endpoint", async () => {
      mockFetch.mockReturnValue(jsonResponse({ id: "pay1", status: "refunded" }));
      await api.payments.refund("pay1");
      expect(mockFetch.mock.calls[0][0]).toBe("/api/payments/pay1/refund");
    });
  });

  describe("request handling", () => {
    it("includes Authorization header when token exists", async () => {
      localStorage.setItem("token", "my-jwt-token");
      mockFetch.mockReturnValue(jsonResponse({}));

      await api.products.get("p1");
      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers.Authorization).toBe("Bearer my-jwt-token");
    });

    it("throws ApiError on non-ok response", async () => {
      mockFetch.mockReturnValue(
        Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: "Unauthorized" }),
        })
      );

      await expect(api.auth.login("a@b.com", "wrong")).rejects.toThrow(
        "Unauthorized"
      );
    });

    it("handles JSON parse failure on error response", async () => {
      mockFetch.mockReturnValue(
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.reject(new Error("parse error")),
        })
      );

      await expect(api.products.get("p1")).rejects.toThrow("Request failed");
    });
  });
});
