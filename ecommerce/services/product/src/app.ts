import express from "express";
import { ProductStore } from "./store";
import { ProductService } from "./service";
import { createProductRoutes } from "./routes";

export function createApp(store?: ProductStore) {
  const app = express();
  const appStore = store ?? new ProductStore();
  const productService = new ProductService(appStore);

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "product" });
  });

  app.use("/", createProductRoutes(productService));

  return { app, store: appStore, service: productService };
}
