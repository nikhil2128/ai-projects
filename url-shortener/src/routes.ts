import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { Config } from "./config.js";
import type { UrlStore } from "./store.js";
import type { RateLimiter } from "./rate-limiter.js";

const URL_REGEX = /^https?:\/\/.+/;
const SHORT_CODE_REGEX = /^[a-zA-Z0-9]+$/;

interface ShortenBody {
  url: string;
}

export function registerRoutes(
  app: FastifyInstance,
  store: UrlStore,
  config: Config,
  limiter: RateLimiter
): void {
  // --- Rate-limiting hook for write endpoints ---
  app.addHook(
    "onRequest",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (request.method !== "POST") return;

      const clientIp =
        (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        request.ip;

      const result = limiter.consume(clientIp);
      reply.header("X-RateLimit-Limit", config.rateLimitMax);
      reply.header("X-RateLimit-Remaining", result.remaining);

      if (!result.allowed) {
        reply.header("Retry-After", Math.ceil(result.retryAfterMs / 1000));
        return reply.status(429).send({
          error: "Too many requests",
          retryAfterMs: result.retryAfterMs,
        });
      }
    }
  );

  // --- POST /api/shorten ---
  app.post(
    "/api/shorten",
    async (request: FastifyRequest<{ Body: ShortenBody }>, reply: FastifyReply) => {
      const { url } = request.body ?? {};

      if (!url || typeof url !== "string") {
        return reply.status(400).send({ error: "Missing required field: url" });
      }

      const trimmed = url.trim();
      if (!URL_REGEX.test(trimmed)) {
        return reply.status(400).send({
          error: "Invalid URL. Must start with http:// or https://",
        });
      }

      if (trimmed.length > 2048) {
        return reply.status(400).send({
          error: "URL exceeds maximum length of 2048 characters",
        });
      }

      try {
        const record = store.shorten(trimmed);
        return reply.status(201).send({
          short_url: `${config.baseUrl}/${record.short_code}`,
          short_code: record.short_code,
          original_url: record.original_url,
          created_at: record.created_at,
        });
      } catch (err) {
        request.log.error(err, "Failed to shorten URL");
        return reply.status(500).send({ error: "Internal server error" });
      }
    }
  );

  // --- GET /:code — Redirect (latency-critical path) ---
  app.get(
    "/:code",
    async (
      request: FastifyRequest<{ Params: { code: string } }>,
      reply: FastifyReply
    ) => {
      const { code } = request.params;

      if (!SHORT_CODE_REGEX.test(code)) {
        return reply.status(400).send({ error: "Invalid short code" });
      }

      const originalUrl = store.resolve(code);
      if (!originalUrl) {
        return reply.status(404).send({ error: "Short URL not found" });
      }

      // Fire-and-forget: record click without blocking the redirect
      setImmediate(() => store.recordClick(code));

      // 301 = browser caches permanently, reducing repeat hits to the server
      return reply.status(301).header("Location", originalUrl).send();
    }
  );

  // --- GET /api/urls/:code — URL info ---
  app.get(
    "/api/urls/:code",
    async (
      request: FastifyRequest<{ Params: { code: string } }>,
      reply: FastifyReply
    ) => {
      const { code } = request.params;

      if (!SHORT_CODE_REGEX.test(code)) {
        return reply.status(400).send({ error: "Invalid short code" });
      }

      const record = store.getUrlInfo(code);
      if (!record) {
        return reply.status(404).send({ error: "Short URL not found" });
      }

      return reply.send({
        short_url: `${config.baseUrl}/${record.short_code}`,
        short_code: record.short_code,
        original_url: record.original_url,
        created_at: record.created_at,
        click_count: record.click_count,
      });
    }
  );

  // --- GET /api/stats — System stats ---
  app.get("/api/stats", async (_request: FastifyRequest, reply: FastifyReply) => {
    const dbStats = store.getStats();
    const cacheStats = store.cacheStats;

    return reply.send({
      urls: dbStats,
      cache: cacheStats,
      uptime_seconds: Math.floor(process.uptime()),
    });
  });

  // --- GET /health ---
  app.get("/health", async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ status: "ok", timestamp: new Date().toISOString() });
  });
}
