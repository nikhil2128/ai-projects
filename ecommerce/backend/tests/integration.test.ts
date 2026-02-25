import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import http from "http";
import { Pool } from "pg";
import { createApp as createAuthApp } from "../services/auth/src/app";
import { createApp as createProductApp } from "../services/product/src/app";
import { createApp as createCartApp } from "../services/cart/src/app";
import { createApp as createOrderApp } from "../services/order/src/app";
import { createApp as createPaymentApp } from "../services/payment/src/app";
import { createGateway } from "../gateway/app";
import {
	HttpProductClient,
	HttpCartClient,
	HttpOrderClient,
} from "../shared/http-clients";
import { getTestPool, cleanTables, closeTestPool } from "../shared/test-db";

function startServer(
	app: Express.Application,
): Promise<{ server: http.Server; port: number }> {
	return new Promise((resolve) => {
		const server = (app as ReturnType<typeof http.createServer>).listen(
			0,
			() => {
				const addr = server.address();
				const port = typeof addr === "object" && addr ? addr.port : 0;
				resolve({ server, port });
			},
		);
	});
}

describe("E-commerce Microservices Integration Tests", () => {
	let servers: http.Server[] = [];
	let gatewayApp: ReturnType<typeof createGateway>["app"];
	let pool: Pool;

	beforeAll(async () => {
		pool = await getTestPool();
		await cleanTables(pool);

		const auth = await startServer(createAuthApp(pool).app);
		const product = await startServer(createProductApp(pool).app);

		const productClient = new HttpProductClient(
			`http://localhost:${product.port}`,
		);
		const cart = await startServer(createCartApp(pool, productClient).app);

		const cartClient = new HttpCartClient(`http://localhost:${cart.port}`);
		const order = await startServer(
			createOrderApp(pool, cartClient, productClient).app,
		);

		const orderClient = new HttpOrderClient(`http://localhost:${order.port}`);
		const payment = await startServer(
			createPaymentApp(pool, orderClient, productClient).app,
		);

		const { app: gw } = createGateway({
			authServiceUrl: `http://localhost:${auth.port}`,
			productServiceUrl: `http://localhost:${product.port}`,
			cartServiceUrl: `http://localhost:${cart.port}`,
			orderServiceUrl: `http://localhost:${order.port}`,
			paymentServiceUrl: `http://localhost:${payment.port}`,
		});
		gatewayApp = gw;
		const gatewaySrv = await startServer(gw);

		servers = [
			auth.server,
			product.server,
			cart.server,
			order.server,
			payment.server,
			gatewaySrv.server,
		];
	});

	afterAll(async () => {
		await Promise.all(
			servers.map(
				(s) => new Promise<void>((resolve) => s.close(() => resolve())),
			),
		);
		await closeTestPool();
	});

	describe("Health Check", () => {
		it("GET /health should return ok from gateway", async () => {
			const res = await request(gatewayApp).get("/health");
			expect(res.status).toBe(200);
			expect(res.body.status).toBe("ok");
			expect(res.body.service).toBe("gateway");
		});
	});

	describe("Auth Routes", () => {
		it("POST /api/auth/register should create a user", async () => {
			const res = await request(gatewayApp).post("/api/auth/register").send({
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
			const res = await request(gatewayApp).post("/api/auth/register").send({
				email: "bad",
				name: "Bob",
				password: "short",
			});

			expect(res.status).toBe(400);
			expect(res.body.error).toBeDefined();
		});

		it("POST /api/auth/login should return a token", async () => {
			await request(gatewayApp).post("/api/auth/register").send({
				email: "login-test@test.com",
				name: "LoginTest",
				password: "password123",
			});

			const res = await request(gatewayApp).post("/api/auth/login").send({
				email: "login-test@test.com",
				password: "password123",
			});

			expect(res.status).toBe(200);
			expect(res.body.token).toBeDefined();
			expect(res.body.userId).toBeDefined();
		});

		it("POST /api/auth/login should reject wrong password", async () => {
			await request(gatewayApp).post("/api/auth/register").send({
				email: "wrongpw@test.com",
				name: "WrongPw",
				password: "password123",
			});

			const res = await request(gatewayApp).post("/api/auth/login").send({
				email: "wrongpw@test.com",
				password: "wrongpassword",
			});

			expect(res.status).toBe(401);
		});
	});

	describe("Product Routes", () => {
		it("POST /api/products should create a product", async () => {
			const res = await request(gatewayApp).post("/api/products").send({
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
			await request(gatewayApp).post("/api/products").send({
				name: "Listing Laptop",
				description: "A laptop for listing",
				price: 999,
				category: "ListTest",
				stock: 10,
			});

			const res = await request(gatewayApp).get(
				"/api/products?category=ListTest",
			);
			expect(res.status).toBe(200);
			expect(res.body.data.length).toBeGreaterThanOrEqual(1);
			expect(res.body.total).toBeGreaterThanOrEqual(1);
		});
	});

	describe("Protected Routes (Auth Required)", () => {
		it("should reject requests without auth token", async () => {
			const res = await request(gatewayApp).get("/api/cart");
			expect(res.status).toBe(401);
		});

		it("should reject requests with invalid auth token", async () => {
			const res = await request(gatewayApp)
				.get("/api/cart")
				.set("Authorization", "Bearer invalid-token");
			expect(res.status).toBe(401);
		});
	});

	describe("Full E-commerce Flow: Register -> Search -> Cart -> Order -> Payment", () => {
		let token: string;

		beforeAll(async () => {
			await request(gatewayApp).post("/api/products").send({
				name: "Wireless Mouse",
				description: "Ergonomic wireless mouse",
				price: 29.99,
				category: "FlowTest",
				stock: 20,
			});
			await request(gatewayApp).post("/api/products").send({
				name: "Mechanical Keyboard",
				description: "Cherry MX Blue switches",
				price: 89.99,
				category: "FlowTest",
				stock: 15,
			});
			await request(gatewayApp).post("/api/products").send({
				name: "Cotton T-Shirt",
				description: "100% organic cotton",
				price: 24.99,
				category: "FlowClothing",
				stock: 50,
			});
		});

		it("should complete the full purchase flow", async () => {
			await request(gatewayApp).post("/api/auth/register").send({
				email: "full-flow@test.com",
				name: "FullFlow",
				password: "password123",
			});
			const loginRes = await request(gatewayApp).post("/api/auth/login").send({
				email: "full-flow@test.com",
				password: "password123",
			});
			token = loginRes.body.token;
			expect(token).toBeDefined();

			const searchRes = await request(gatewayApp).get(
				"/api/products?category=FlowTest",
			);
			expect(searchRes.status).toBe(200);
			expect(searchRes.body.data.length).toBe(2);

			const mouseId = searchRes.body.data.find(
				(p: { name: string }) => p.name === "Wireless Mouse",
			).id;
			const keyboardId = searchRes.body.data.find(
				(p: { name: string }) => p.name === "Mechanical Keyboard",
			).id;

			const addMouseRes = await request(gatewayApp)
				.post("/api/cart/items")
				.set("Authorization", `Bearer ${token}`)
				.send({ productId: mouseId, quantity: 2 });
			expect(addMouseRes.status).toBe(200);

			const addKeyboardRes = await request(gatewayApp)
				.post("/api/cart/items")
				.set("Authorization", `Bearer ${token}`)
				.send({ productId: keyboardId, quantity: 1 });
			expect(addKeyboardRes.status).toBe(200);

			const cartRes = await request(gatewayApp)
				.get("/api/cart")
				.set("Authorization", `Bearer ${token}`);
			expect(cartRes.status).toBe(200);
			expect(cartRes.body.items.length).toBe(2);

			const orderRes = await request(gatewayApp)
				.post("/api/orders")
				.set("Authorization", `Bearer ${token}`)
				.send({ shippingAddress: "123 Main St, Springfield" });
			expect(orderRes.status).toBe(201);
			expect(orderRes.body.status).toBe("pending");
			expect(orderRes.body.totalAmount).toBeCloseTo(29.99 * 2 + 89.99, 2);

			const orderId = orderRes.body.id;

			const emptyCartRes = await request(gatewayApp)
				.get("/api/cart")
				.set("Authorization", `Bearer ${token}`);
			expect(emptyCartRes.body.items.length).toBe(0);

			const paymentRes = await request(gatewayApp)
				.post("/api/payments")
				.set("Authorization", `Bearer ${token}`)
				.send({ orderId, method: "credit_card" });
			expect(paymentRes.status).toBe(201);
			expect(paymentRes.body.status).toBe("completed");
			expect(paymentRes.body.amount).toBeCloseTo(29.99 * 2 + 89.99, 2);

			const confirmedOrderRes = await request(gatewayApp)
				.get(`/api/orders/${orderId}`)
				.set("Authorization", `Bearer ${token}`);
			expect(confirmedOrderRes.status).toBe(200);
			expect(confirmedOrderRes.body.status).toBe("confirmed");
			expect(confirmedOrderRes.body.paymentId).toBeDefined();

			const ordersRes = await request(gatewayApp)
				.get("/api/orders")
				.set("Authorization", `Bearer ${token}`);
			expect(ordersRes.body.data.length).toBe(1);

			const mouseAfterRes = await request(gatewayApp).get(
				`/api/products/${mouseId}`,
			);
			expect(mouseAfterRes.body.stock).toBe(18);

			const keyboardAfterRes = await request(gatewayApp).get(
				`/api/products/${keyboardId}`,
			);
			expect(keyboardAfterRes.body.stock).toBe(14);
		});

		it("should handle order cancellation and refund flow", async () => {
			await request(gatewayApp).post("/api/auth/register").send({
				email: "refund-flow@test.com",
				name: "RefundFlow",
				password: "password123",
			});
			const loginRes = await request(gatewayApp).post("/api/auth/login").send({
				email: "refund-flow@test.com",
				password: "password123",
			});
			token = loginRes.body.token;

			const products = await request(gatewayApp).get(
				"/api/products?category=FlowTest",
			);
			const mouseId = products.body.data.find(
				(p: { name: string }) => p.name === "Wireless Mouse",
			).id;

			const mouseBefore = await request(gatewayApp).get(
				`/api/products/${mouseId}`,
			);
			const stockBefore = mouseBefore.body.stock;

			await request(gatewayApp)
				.post("/api/cart/items")
				.set("Authorization", `Bearer ${token}`)
				.send({ productId: mouseId, quantity: 5 });

			const orderRes = await request(gatewayApp)
				.post("/api/orders")
				.set("Authorization", `Bearer ${token}`)
				.send({ shippingAddress: "456 Oak Ave" });

			const orderId = orderRes.body.id;

			const payRes = await request(gatewayApp)
				.post("/api/payments")
				.set("Authorization", `Bearer ${token}`)
				.send({ orderId, method: "paypal" });
			expect(payRes.body.status).toBe("completed");

			const refundRes = await request(gatewayApp)
				.post(`/api/payments/${payRes.body.id}/refund`)
				.set("Authorization", `Bearer ${token}`);
			expect(refundRes.status).toBe(200);
			expect(refundRes.body.status).toBe("refunded");

			const orderAfterRes = await request(gatewayApp)
				.get(`/api/orders/${orderId}`)
				.set("Authorization", `Bearer ${token}`);
			expect(orderAfterRes.body.status).toBe("cancelled");

			const mouseAfterRes = await request(gatewayApp).get(
				`/api/products/${mouseId}`,
			);
			expect(mouseAfterRes.body.stock).toBe(stockBefore);
		});

		it("should handle cart manipulation (update quantity, remove items)", async () => {
			await request(gatewayApp).post("/api/auth/register").send({
				email: "cart-manip@test.com",
				name: "CartManip",
				password: "password123",
			});
			const loginRes = await request(gatewayApp).post("/api/auth/login").send({
				email: "cart-manip@test.com",
				password: "password123",
			});
			token = loginRes.body.token;

			const products = await request(gatewayApp).get(
				"/api/products?category=FlowTest",
			);
			const mouseId = products.body.data.find(
				(p: { name: string }) => p.name === "Wireless Mouse",
			).id;

			const clothing = await request(gatewayApp).get(
				"/api/products?category=FlowClothing",
			);
			const shirtId = clothing.body.data.find(
				(p: { name: string }) => p.name === "Cotton T-Shirt",
			).id;

			await request(gatewayApp)
				.post("/api/cart/items")
				.set("Authorization", `Bearer ${token}`)
				.send({ productId: mouseId, quantity: 1 });

			await request(gatewayApp)
				.post("/api/cart/items")
				.set("Authorization", `Bearer ${token}`)
				.send({ productId: shirtId, quantity: 3 });

			const updateRes = await request(gatewayApp)
				.put(`/api/cart/items/${mouseId}`)
				.set("Authorization", `Bearer ${token}`)
				.send({ quantity: 4 });
			expect(updateRes.status).toBe(200);
			expect(
				updateRes.body.items.find(
					(i: { productId: string }) => i.productId === mouseId,
				).quantity,
			).toBe(4);

			const removeRes = await request(gatewayApp)
				.delete(`/api/cart/items/${shirtId}`)
				.set("Authorization", `Bearer ${token}`);
			expect(removeRes.status).toBe(200);
			expect(removeRes.body.items.length).toBe(1);

			const clearRes = await request(gatewayApp)
				.delete("/api/cart")
				.set("Authorization", `Bearer ${token}`);
			expect(clearRes.status).toBe(200);
			expect(clearRes.body.items.length).toBe(0);
		});
	});
});
