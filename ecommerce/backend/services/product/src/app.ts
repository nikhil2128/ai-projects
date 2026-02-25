import express from "express";
import { Pool } from "pg";
import { ProductStore } from "./store";
import { ProductService } from "./service";
import { createProductRoutes } from "./routes";
import { FavoriteStore } from "./favoriteStore";
import { createFavoriteRoutes } from "./favoriteRoutes";

export function createApp(pool: Pool) {
  const app = express();
  const store = new ProductStore(pool);
  const service = new ProductService(store);
  const favoriteStore = new FavoriteStore(pool);

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "product" });
  });

  app.use("/favorites", createFavoriteRoutes(favoriteStore, store));
  app.use("/", createProductRoutes(service));

  return { app, store, service };
}
