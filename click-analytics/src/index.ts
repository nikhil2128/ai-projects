import express from "express";
import cors from "cors";
import { config } from "./config";
import { initializeSchema } from "./database/schema";
import { closePool, isDbHealthy } from "./database/connection";
import { getRedis, isRedisHealthy, closeRedis } from "./queue/redis";
import { startBufferFlush, stopBufferFlush, getBufferSize } from "./buffer/memory";
import { errorHandler } from "./middleware/errorHandler";
import { rateLimiter } from "./middleware/rateLimiter";
import trackingRoutes from "./routes/tracking";
import analyticsRoutes from "./routes/analytics";

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
app.use(errorHandler);

async function start() {
  // Connect Redis (non-blocking — events buffer in memory if Redis is slow)
  getRedis();

  // Ensure PostgreSQL schema exists
  await initializeSchema();

  // Start periodic buffer → Redis flush
  startBufferFlush();

  const server = app.listen(config.port, () => {
    console.log(`[API] Click analytics server running on port ${config.port}`);
  });

  async function shutdown() {
    console.log("[API] Shutting down…");
    stopBufferFlush();
    server.close(async () => {
      await closeRedis();
      await closePool();
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
