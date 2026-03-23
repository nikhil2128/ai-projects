import express from "express";
import { Pool } from "pg";
import { ProductServiceClient } from "../../../shared/types";
import { HttpProductClient } from "../../../shared/http-clients";
import { CartStore } from "./store";
import { CartService } from "./service";
import { createCartRoutes } from "./routes";

const PRODUCT_SERVICE_URL =
  process.env.PRODUCT_SERVICE_URL ?? "http://localhost:3002";

export function createApp(
  pool: Pool,
  productClient?: ProductServiceClient
) {
  const app = express();
  const store = new CartStore(pool);
  const client = productClient ?? new HttpProductClient(PRODUCT_SERVICE_URL);
  const service = new CartService(store, client);

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "cart" });
  });

  app.use("/", createCartRoutes(service));

  return { app, store, service };
}
