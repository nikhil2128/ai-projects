import express from "express";
import cors from "cors";
import { config } from "./config";
import { initializeSchema } from "./database/schema";
import { closeDb } from "./database/connection";
import { errorHandler } from "./middleware/errorHandler";
import trackingRoutes from "./routes/tracking";
import analyticsRoutes from "./routes/analytics";

const app = express();

app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api", trackingRoutes);
app.use("/api/analytics", analyticsRoutes);

app.use(errorHandler);

initializeSchema();

const server = app.listen(config.port, () => {
  console.log(`Click analytics server running on port ${config.port}`);
});

function shutdown() {
  console.log("Shutting down...");
  server.close(() => {
    closeDb();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export default app;
