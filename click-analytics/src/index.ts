import express from "express";
import path from "path";
import cors from "cors";
import { config } from "./config";
import { initializeSchema } from "./database/schema";
import { closeDb, isDbHealthy } from "./database/connection";
import { getRedis, isRedisHealthy, closeRedis } from "./queue/redis";
import { startBufferFlush, stopBufferFlush, getBufferSize } from "./buffer/memory";
import { refreshCache } from "./services/apikeys";
import { errorHandler } from "./middleware/errorHandler";
import { rateLimiter } from "./middleware/rateLimiter";
import trackingRoutes from "./routes/tracking";
import analyticsRoutes from "./routes/analytics";
import websiteRoutes from "./routes/websites";
import seedRoutes from "./routes/seed";

const app = express();

app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: "1mb" }));
app.use("/api/track", rateLimiter);

app.get("/api/health", async (_req, res) => {
  const [redisOk, dbOk] = await Promise.all([
    isRedisHealthy(),
    isDbHealthy(),
  ]);

  const status = redisOk && dbOk ? "ok" : "degraded";
  res.status(status === "ok" ? 200 : 503).json({
    status,
    redis: redisOk ? "connected" : "disconnected",
    database: dbOk ? "connected" : "disconnected",
    bufferSize: getBufferSize(),
    timestamp: new Date().toISOString(),
  });
});

app.use("/api", trackingRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/websites", websiteRoutes);
app.use("/api", seedRoutes);

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/admin", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "admin", "index.html"));
});

app.use(errorHandler);

async function start() {
  getRedis();

  if (config.pipeline.mode === "clickhouse") {
    await initializeSchema();
  } else {
    console.log(
      "[API] Skipping ClickHouse schema bootstrap (kinesis-s3-clickhouse mode)"
    );
  }

  try {
    await refreshCache();
    console.log("[API] API key cache loaded");
  } catch (err) {
    console.warn("[API] Could not pre-load API key cache:", err);
  }

  startBufferFlush();

  const server = app.listen(config.port, () => {
    console.log(`[API] Click analytics server running on port ${config.port}`);
  });

  async function shutdown() {
    console.log("[API] Shutting down…");
    stopBufferFlush();
    server.close(async () => {
      await closeRedis();
      await closeDb();
      process.exit(0);
    });
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((err) => {
  console.error("[API] Fatal error:", err);
  process.exit(1);
});

export default app;
