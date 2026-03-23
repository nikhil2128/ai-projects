import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import compression from "compression";
import cors from "cors";
import helmet from "helmet";

export function createRateLimiter(windowMs = 60_000, max = 100) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" },
    validate: { xForwardedForHeader: false, trustProxy: false },
  });
}

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts, please try again later" },
  validate: { xForwardedForHeader: false, trustProxy: false },
});

export const compressionMiddleware = compression({
  threshold: 1024,
  level: 6,
});

export const corsMiddleware = cors({
  origin: process.env.CORS_ORIGIN ?? "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-user-id", "x-user-role", "x-idempotency-key"],
  maxAge: 86400,
});

export const securityHeaders = helmet({
  contentSecurityPolicy: false,
});

export function requestLogger(req: Request, _res: Response, next: NextFunction) {
  const start = Date.now();
  _res.on("finish", () => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(
        `SLOW ${req.method} ${req.originalUrl} ${_res.statusCode} ${duration}ms`
      );
    }
  });
  next();
}

export function jsonSizeLimit(limit = "1mb") {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers["content-length"] ?? "0", 10);
    const maxBytes =
      limit === "1mb" ? 1_048_576 : limit === "10mb" ? 10_485_760 : 1_048_576;
    if (contentLength > maxBytes) {
      res.status(413).json({ error: "Request payload too large" });
      return;
    }
    next();
  };
}
