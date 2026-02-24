import express from "express";
import { CartServiceClient, ProductServiceClient } from "../../../shared/types";
import { HttpCartClient, HttpProductClient } from "../../../shared/http-clients";
import { OrderStore } from "./store";
import { OrderService } from "./service";
import { createOrderRoutes } from "./routes";

const CART_SERVICE_URL =
  process.env.CART_SERVICE_URL ?? "http://localhost:3003";
const PRODUCT_SERVICE_URL =
  process.env.PRODUCT_SERVICE_URL ?? "http://localhost:3002";

export function createApp(
  store?: OrderStore,
  cartClient?: CartServiceClient,
  productClient?: ProductServiceClient
) {
  const app = express();
  const appStore = store ?? new OrderStore();
  const cart = cartClient ?? new HttpCartClient(CART_SERVICE_URL);
  const product = productClient ?? new HttpProductClient(PRODUCT_SERVICE_URL);
  const orderService = new OrderService(appStore, cart, product);

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "order" });
  });

  app.use("/", createOrderRoutes(orderService));

  return { app, store: appStore, service: orderService };
}
