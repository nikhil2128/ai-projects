import Fastify from "fastify";
import { loadConfig } from "./config.js";
import { UrlStore } from "./store.js";
import { RateLimiter } from "./rate-limiter.js";
import { registerRoutes } from "./routes.js";

async function main() {
  const config = loadConfig();

  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      transport:
        process.env.NODE_ENV !== "production"
          ? { target: "pino-pretty", options: { translateTime: "HH:MM:ss" } }
          : undefined,
    },
    trustProxy: true,
    requestTimeout: 10_000,
  });

  const store = new UrlStore(config);
  const limiter = new RateLimiter(config.rateLimitMax, config.rateLimitWindowMs);

  registerRoutes(app, store, config, limiter);

  // --- Graceful shutdown ---
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down gracefully...`);
    try {
      await app.close();
      limiter.destroy();
      store.close();
      app.log.info("Server closed cleanly");
      process.exit(0);
    } catch (err) {
      app.log.error(err, "Error during shutdown");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info(
      `URL Shortener running at ${config.baseUrl} | Cache: ${config.cacheMaxSize} entries | Rate limit: ${config.rateLimitMax}/min`
    );
  } catch (err) {
    app.log.error(err, "Failed to start server");
    process.exit(1);
  }
}

main();
