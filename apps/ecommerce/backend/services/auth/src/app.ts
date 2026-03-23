import express from "express";
import { Pool } from "pg";
import { AuthStore } from "./store";
import { AuthService } from "./service";
import { createAuthRoutes } from "./routes";

export function createApp(pool: Pool) {
  const app = express();
  const store = new AuthStore(pool);
  const service = new AuthService(store);

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "auth" });
  });

  app.use("/", createAuthRoutes(service));

  return { app, store, service };
}
