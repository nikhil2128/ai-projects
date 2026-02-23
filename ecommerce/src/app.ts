import express from "express";
import { InMemoryStore } from "./store/in-memory-store";
import { AuthService } from "./services/auth.service";
import { ProductService } from "./services/product.service";
import { CartService } from "./services/cart.service";
import { OrderService } from "./services/order.service";
import { PaymentService } from "./services/payment.service";
import { createAuthRouter } from "./routes/auth.routes";
import { createProductRouter } from "./routes/product.routes";
import { createCartRouter } from "./routes/cart.routes";
import { createOrderRouter } from "./routes/order.routes";
import { createPaymentRouter } from "./routes/payment.routes";

export function createApp(store?: InMemoryStore) {
  const app = express();
  const appStore = store ?? new InMemoryStore();

  const authService = new AuthService(appStore);
  const productService = new ProductService(appStore);
  const cartService = new CartService(appStore);
  const orderService = new OrderService(appStore);
  const paymentService = new PaymentService(appStore);

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", createAuthRouter(authService));
  app.use("/api/products", createProductRouter(productService));
  app.use("/api/cart", createCartRouter(cartService, authService));
  app.use("/api/orders", createOrderRouter(orderService, authService));
  app.use("/api/payments", createPaymentRouter(paymentService, authService));

  return { app, store: appStore, services: { authService, productService, cartService, orderService, paymentService } };
}
