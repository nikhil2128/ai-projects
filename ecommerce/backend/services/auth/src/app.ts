import express from "express";
import { AuthStore } from "./store";
import { AuthService } from "./service";
import { createAuthRoutes } from "./routes";

export function createApp(store?: AuthStore) {
  const app = express();
  const appStore = store ?? new AuthStore();
  const authService = new AuthService(appStore);

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "auth" });
  });

  app.use("/", createAuthRoutes(authService));

  return { app, store: appStore, service: authService };
}
