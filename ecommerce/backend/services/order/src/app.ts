import express from "express";
import { Pool } from "pg";
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
  pool: Pool,
  cartClient?: CartServiceClient,
  productClient?: ProductServiceClient
) {
  const app = express();
  const store = new OrderStore(pool);
  const cart = cartClient ?? new HttpCartClient(CART_SERVICE_URL);
  const product = productClient ?? new HttpProductClient(PRODUCT_SERVICE_URL);
  const service = new OrderService(store, cart, product);

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "order" });
  });

  app.use("/", createOrderRoutes(service));

  return { app, store, service };
}
