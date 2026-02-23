import express from "express";
import { ProductServiceClient } from "../../../shared/types";
import { HttpProductClient } from "../../../shared/http-clients";
import { CartStore } from "./store";
import { CartService } from "./service";
import { createCartRoutes } from "./routes";

const PRODUCT_SERVICE_URL =
  process.env.PRODUCT_SERVICE_URL ?? "http://localhost:3002";

export function createApp(
  store?: CartStore,
  productClient?: ProductServiceClient
) {
  const app = express();
  const appStore = store ?? new CartStore();
  const client = productClient ?? new HttpProductClient(PRODUCT_SERVICE_URL);
  const cartService = new CartService(appStore, client);

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "cart" });
  });

  app.use("/", createCartRoutes(cartService));

  return { app, store: appStore, service: cartService };
}
