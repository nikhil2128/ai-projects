import express, { Request, Response, NextFunction } from "express";
import http from "http";
import {
  createRateLimiter,
  authRateLimiter,
  compressionMiddleware,
  corsMiddleware,
  securityHeaders,
  requestLogger,
} from "../shared/middleware";
import { TTLCache } from "../shared/cache";

export interface GatewayConfig {
  authServiceUrl: string;
  productServiceUrl: string;
  cartServiceUrl: string;
  orderServiceUrl: string;
  paymentServiceUrl: string;
  sellerServiceUrl: string;
}

interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
}

const DEFAULT_CONFIG: GatewayConfig = {
  authServiceUrl: process.env.AUTH_SERVICE_URL ?? "http://localhost:3001",
  productServiceUrl: process.env.PRODUCT_SERVICE_URL ?? "http://localhost:3002",
  cartServiceUrl: process.env.CART_SERVICE_URL ?? "http://localhost:3003",
  orderServiceUrl: process.env.ORDER_SERVICE_URL ?? "http://localhost:3004",
  paymentServiceUrl: process.env.PAYMENT_SERVICE_URL ?? "http://localhost:3005",
  sellerServiceUrl: process.env.SELLER_SERVICE_URL ?? "http://localhost:3006",
};

const tokenCache = new TTLCache<{ userId: string; role: string }>(60_000);

export function createGateway(config?: Partial<GatewayConfig>) {
  const app = express();
  const cfg = { ...DEFAULT_CONFIG, ...config };

  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(compressionMiddleware);
  app.use(requestLogger);
  app.use(express.json({ limit: "50mb" }));

  app.set("trust proxy", 1);

  const generalLimiter = createRateLimiter(60_000, 200);
  app.use(generalLimiter);

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "gateway",
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage().heapUsed,
    });
  });

  function createAuthMiddleware() {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const token = authHeader.slice(7);

      const cached = tokenCache.get(token);
      if (cached) {
        req.userId = cached.userId;
        req.userRole = cached.role;
        next();
        return;
      }

      try {
        const response = await fetch(`${cfg.authServiceUrl}/validate-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
          res.status(401).json({ error: "Invalid or expired token" });
          return;
        }

        const { userId, role } = (await response.json()) as { userId: string; role: string };
        tokenCache.set(token, { userId, role });
        req.userId = userId;
        req.userRole = role;
        next();
      } catch {
        res.status(503).json({ error: "Auth service unavailable" });
      }
    };
  }

  async function proxy(
    serviceUrl: string,
    req: AuthenticatedRequest,
    res: Response,
    timeoutMs = 15_000
  ) {
    const targetUrl = `${serviceUrl}${req.url}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (req.userId) {
      headers["x-user-id"] = req.userId;
    }
    if (req.userRole) {
      headers["x-user-role"] = req.userRole;
    }

    const idempotencyKey = req.headers["x-idempotency-key"] as string;
    if (idempotencyKey) {
      headers["x-idempotency-key"] = idempotencyKey;
    }

    const hasBody = !["GET", "HEAD"].includes(req.method);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(targetUrl, {
        method: req.method,
        headers,
        body: hasBody ? JSON.stringify(req.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        res.status(504).json({ error: "Service timeout" });
      } else {
        res.status(503).json({ error: "Service unavailable" });
      }
    }
  }

  function proxyStream(
    serviceUrl: string,
    req: AuthenticatedRequest,
    res: Response,
    timeoutMs = 15_000
  ) {
    const parsed = new URL(`${serviceUrl}${req.url}`);
    const fwdHeaders: Record<string, string> = {};

    if (req.headers["content-type"]) fwdHeaders["content-type"] = req.headers["content-type"] as string;
    if (req.headers["content-length"]) fwdHeaders["content-length"] = req.headers["content-length"] as string;
    if (req.userId) fwdHeaders["x-user-id"] = req.userId;
    if (req.userRole) fwdHeaders["x-user-role"] = req.userRole;

    const proxyReq = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: req.method,
        headers: fwdHeaders,
        timeout: timeoutMs,
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );

    proxyReq.on("error", () => {
      if (!res.headersSent) {
        res.status(503).json({ error: "Service unavailable" });
      }
    });

    proxyReq.on("timeout", () => {
      proxyReq.destroy();
      if (!res.headersSent) {
        res.status(504).json({ error: "Service timeout" });
      }
    });

    req.pipe(proxyReq);
  }

  app.use(
    "/api/auth",
    authRateLimiter,
    (req: Request, res: Response) => {
      proxy(cfg.authServiceUrl, req, res);
    }
  );

  app.use("/api/products", (req: Request, res: Response) => {
    proxy(cfg.productServiceUrl, req, res);
  });

  const auth = createAuthMiddleware();

  app.use(
    "/api/favorites",
    auth,
    (req: AuthenticatedRequest, res: Response) => {
      req.url = `/favorites${req.url}`;
      proxy(cfg.productServiceUrl, req, res);
    }
  );

  app.use(
    "/api/cart",
    auth,
    (req: AuthenticatedRequest, res: Response) => {
      proxy(cfg.cartServiceUrl, req, res);
    }
  );

  app.use(
    "/api/orders",
    auth,
    (req: AuthenticatedRequest, res: Response) => {
      proxy(cfg.orderServiceUrl, req, res);
    }
  );

  app.use(
    "/api/payments",
    auth,
    (req: AuthenticatedRequest, res: Response) => {
      proxy(cfg.paymentServiceUrl, req, res);
    }
  );

  app.use(
    "/api/seller",
    auth,
    (req: AuthenticatedRequest, res: Response) => {
      if (req.userRole !== "seller") {
        res.status(403).json({ error: "Seller access required" });
        return;
      }
      const isBatchUpload = req.url.includes("/batch-upload") && req.method === "POST";
      if (isBatchUpload) {
        proxyStream(cfg.sellerServiceUrl, req, res, 120_000);
      } else {
        proxy(cfg.sellerServiceUrl, req, res);
      }
    }
  );

  return { app, config: cfg };
}
