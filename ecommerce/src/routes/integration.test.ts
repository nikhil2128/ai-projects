import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import type { Express } from "express";

describe("E-commerce API Integration Tests", () => {
  let app: Express;

  beforeEach(() => {
    ({ app } = createApp());
  });

  describe("Health Check", () => {
    it("GET /health should return ok", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
    });
  });

  describe("Auth Routes", () => {
    it("POST /api/auth/register should create a user", async () => {
      const res = await request(app).post("/api/auth/register").send({
        email: "alice@test.com",
        name: "Alice",
        password: "password123",
      });

      expect(res.status).toBe(201);
      expect(res.body.email).toBe("alice@test.com");
      expect(res.body.name).toBe("Alice");
      expect(res.body.passwordHash).toBeUndefined();
    });

    it("POST /api/auth/register should reject invalid input", async () => {
      const res = await request(app).post("/api/auth/register").send({
        email: "bad",
        name: "Bob",
        password: "short",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("POST /api/auth/login should return a token", async () => {
      await request(app).post("/api/auth/register").send({
        email: "alice@test.com",
        name: "Alice",
        password: "password123",
      });

      const res = await request(app).post("/api/auth/login").send({
        email: "alice@test.com",
        password: "password123",
      });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.userId).toBeDefined();
    });

    it("POST /api/auth/login should reject wrong password", async () => {
      await request(app).post("/api/auth/register").send({
        email: "alice@test.com",
        name: "Alice",
        password: "password123",
      });

      const res = await request(app).post("/api/auth/login").send({
        email: "alice@test.com",
        password: "wrongpassword",
      });

      expect(res.status).toBe(401);
    });
  });

  describe("Product Routes", () => {
    it("POST /api/products should create a product", async () => {
      const res = await request(app).post("/api/products").send({
        name: "Test Laptop",
        description: "High performance laptop",
        price: 999.99,
        category: "Electronics",
        stock: 10,
      });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("Test Laptop");
    });

    it("GET /api/products should list products", async () => {
      await request(app).post("/api/products").send({
        name: "Laptop",
        description: "A laptop",
        price: 999,
        category: "Electronics",
        stock: 10,
      });

      const res = await request(app).get("/api/products");
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
    });

    it("GET /api/products?keyword=laptop should search products", async () => {
      await request(app).post("/api/products").send({
        name: "Laptop",
        description: "A laptop",
        price: 999,
        category: "Electronics",
        stock: 10,
      });
      await request(app).post("/api/products").send({
        name: "Mouse",
        description: "A mouse",
        price: 29,
        category: "Electronics",
        stock: 50,
      });

      const res = await request(app).get("/api/products?keyword=laptop");
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].name).toBe("Laptop");
    });

    it("GET /api/products/:id should return a product", async () => {
      const created = await request(app).post("/api/products").send({
        name: "Laptop",
        description: "A laptop",
        price: 999,
        category: "Electronics",
        stock: 10,
      });

      const res = await request(app).get(`/api/products/${created.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Laptop");
    });
  });

  describe("Protected Routes (Auth Required)", () => {
    it("should reject requests without auth token", async () => {
      const res = await request(app).get("/api/cart");
      expect(res.status).toBe(401);
    });

    it("should reject requests with invalid auth token", async () => {
      const res = await request(app)
        .get("/api/cart")
        .set("Authorization", "Bearer invalid-token");
      expect(res.status).toBe(401);
    });
  });

  describe("Full E-commerce Flow: Register -> Search -> Cart -> Order -> Payment", () => {
    let token: string;

    beforeEach(async () => {
      await request(app).post("/api/products").send({
        name: "Wireless Mouse",
        description: "Ergonomic wireless mouse",
        price: 29.99,
        category: "Electronics",
        stock: 20,
      });
      await request(app).post("/api/products").send({
        name: "Mechanical Keyboard",
        description: "Cherry MX Blue switches",
        price: 89.99,
        category: "Electronics",
        stock: 15,
      });
      await request(app).post("/api/products").send({
        name: "Cotton T-Shirt",
        description: "100% organic cotton",
        price: 24.99,
        category: "Clothing",
        stock: 50,
      });
    });

    async function registerAndLogin() {
      await request(app).post("/api/auth/register").send({
        email: "shopper@test.com",
        name: "Shopper",
        password: "password123",
      });

      const loginRes = await request(app).post("/api/auth/login").send({
        email: "shopper@test.com",
        password: "password123",
      });

      return loginRes.body.token;
    }

    it("should complete the full purchase flow", async () => {
      // 1. Register and login
      token = await registerAndLogin();
      expect(token).toBeDefined();

      // 2. Search for products
      const searchRes = await request(app).get(
        "/api/products?category=Electronics"
      );
      expect(searchRes.status).toBe(200);
      expect(searchRes.body.length).toBe(2);

      const mouseId = searchRes.body.find(
        (p: { name: string }) => p.name === "Wireless Mouse"
      ).id;
      const keyboardId = searchRes.body.find(
        (p: { name: string }) => p.name === "Mechanical Keyboard"
      ).id;

      // 3. Add products to cart
      const addMouseRes = await request(app)
        .post("/api/cart/items")
        .set("Authorization", `Bearer ${token}`)
        .send({ productId: mouseId, quantity: 2 });
      expect(addMouseRes.status).toBe(200);

      const addKeyboardRes = await request(app)
        .post("/api/cart/items")
        .set("Authorization", `Bearer ${token}`)
        .send({ productId: keyboardId, quantity: 1 });
      expect(addKeyboardRes.status).toBe(200);

      // 4. Verify cart contents
      const cartRes = await request(app)
        .get("/api/cart")
        .set("Authorization", `Bearer ${token}`);
      expect(cartRes.status).toBe(200);
      expect(cartRes.body.items.length).toBe(2);

      // 5. Create order
      const orderRes = await request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${token}`)
        .send({ shippingAddress: "123 Main St, Springfield" });
      expect(orderRes.status).toBe(201);
      expect(orderRes.body.status).toBe("pending");
      expect(orderRes.body.totalAmount).toBeCloseTo(29.99 * 2 + 89.99, 2);

      const orderId = orderRes.body.id;

      // 6. Cart should be empty after order
      const emptyCartRes = await request(app)
        .get("/api/cart")
        .set("Authorization", `Bearer ${token}`);
      expect(emptyCartRes.body.items.length).toBe(0);

      // 7. Process payment
      const paymentRes = await request(app)
        .post("/api/payments")
        .set("Authorization", `Bearer ${token}`)
        .send({ orderId, method: "credit_card" });
      expect(paymentRes.status).toBe(201);
      expect(paymentRes.body.status).toBe("completed");
      expect(paymentRes.body.amount).toBeCloseTo(29.99 * 2 + 89.99, 2);

      // 8. Order should now be confirmed
      const confirmedOrderRes = await request(app)
        .get(`/api/orders/${orderId}`)
        .set("Authorization", `Bearer ${token}`);
      expect(confirmedOrderRes.status).toBe(200);
      expect(confirmedOrderRes.body.status).toBe("confirmed");
      expect(confirmedOrderRes.body.paymentId).toBeDefined();

      // 9. Verify order history
      const ordersRes = await request(app)
        .get("/api/orders")
        .set("Authorization", `Bearer ${token}`);
      expect(ordersRes.body.length).toBe(1);

      // 10. Verify product stock was reduced
      const mouseAfterRes = await request(app).get(
        `/api/products/${mouseId}`
      );
      expect(mouseAfterRes.body.stock).toBe(18);

      const keyboardAfterRes = await request(app).get(
        `/api/products/${keyboardId}`
      );
      expect(keyboardAfterRes.body.stock).toBe(14);
    });

    it("should handle order cancellation and refund flow", async () => {
      token = await registerAndLogin();

      const products = await request(app).get("/api/products");
      const mouseId = products.body.find(
        (p: { name: string }) => p.name === "Wireless Mouse"
      ).id;

      await request(app)
        .post("/api/cart/items")
        .set("Authorization", `Bearer ${token}`)
        .send({ productId: mouseId, quantity: 5 });

      const orderRes = await request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${token}`)
        .send({ shippingAddress: "456 Oak Ave" });

      const orderId = orderRes.body.id;

      // Pay for the order
      const payRes = await request(app)
        .post("/api/payments")
        .set("Authorization", `Bearer ${token}`)
        .send({ orderId, method: "paypal" });
      expect(payRes.body.status).toBe("completed");

      // Refund the payment
      const refundRes = await request(app)
        .post(`/api/payments/${payRes.body.id}/refund`)
        .set("Authorization", `Bearer ${token}`);
      expect(refundRes.status).toBe(200);
      expect(refundRes.body.status).toBe("refunded");

      // Order should be cancelled
      const orderAfterRes = await request(app)
        .get(`/api/orders/${orderId}`)
        .set("Authorization", `Bearer ${token}`);
      expect(orderAfterRes.body.status).toBe("cancelled");

      // Stock should be restored
      const mouseAfterRes = await request(app).get(
        `/api/products/${mouseId}`
      );
      expect(mouseAfterRes.body.stock).toBe(20);
    });

    it("should handle cart manipulation (update quantity, remove items)", async () => {
      token = await registerAndLogin();

      const products = await request(app).get("/api/products");
      const mouseId = products.body.find(
        (p: { name: string }) => p.name === "Wireless Mouse"
      ).id;
      const shirtId = products.body.find(
        (p: { name: string }) => p.name === "Cotton T-Shirt"
      ).id;

      // Add items
      await request(app)
        .post("/api/cart/items")
        .set("Authorization", `Bearer ${token}`)
        .send({ productId: mouseId, quantity: 1 });

      await request(app)
        .post("/api/cart/items")
        .set("Authorization", `Bearer ${token}`)
        .send({ productId: shirtId, quantity: 3 });

      // Update mouse quantity
      const updateRes = await request(app)
        .put(`/api/cart/items/${mouseId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ quantity: 4 });
      expect(updateRes.status).toBe(200);
      expect(
        updateRes.body.items.find(
          (i: { productId: string }) => i.productId === mouseId
        ).quantity
      ).toBe(4);

      // Remove shirt
      const removeRes = await request(app)
        .delete(`/api/cart/items/${shirtId}`)
        .set("Authorization", `Bearer ${token}`);
      expect(removeRes.status).toBe(200);
      expect(removeRes.body.items.length).toBe(1);

      // Clear cart
      const clearRes = await request(app)
        .delete("/api/cart")
        .set("Authorization", `Bearer ${token}`);
      expect(clearRes.status).toBe(200);
      expect(clearRes.body.items.length).toBe(0);
    });
  });
});
