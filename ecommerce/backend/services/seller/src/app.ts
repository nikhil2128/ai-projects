import express from "express";
import { Pool } from "pg";
import { SellerStore } from "./store";
import { SellerService } from "./service";
import { createSellerRoutes } from "./routes";

export function createApp(pool: Pool) {
  const app = express();
  const store = new SellerStore(pool);
  const service = new SellerService(store);

  app.use(express.json({ limit: "10mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "seller" });
  });

  app.use("/", createSellerRoutes(service));

  return { app, store, service };
}
