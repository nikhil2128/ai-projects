import express from "express";
import { Pool } from "pg";
import { ProductStore } from "./store";
import { ProductService } from "./service";
import { createProductRoutes } from "./routes";

export function createApp(pool: Pool) {
  const app = express();
  const store = new ProductStore(pool);
  const service = new ProductService(store);

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "product" });
  });

  app.use("/", createProductRoutes(service));

  return { app, store, service };
}
