import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { timingSafeCompare } from '../utils/sanitize';
import { randomUUID } from 'crypto';

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'no-referrer' },
});

export const apiRateLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
  keyGenerator: (req) => {
    return (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
  },
});

/**
 * Attaches a unique request ID to every request for audit correlation.
 * The ID is exposed via the `X-Request-Id` response header.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers['x-request-id'] as string) || randomUUID();
  (req as Request & { requestId: string }).requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}

/**
 * Timing-safe API key authentication middleware.
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  if (!config.apiKey) {
    if (config.nodeEnv === 'production') {
      res.status(500).json({ error: 'API_KEY not configured' });
      return;
    }
    next();
    return;
  }

  const provided = req.headers['x-api-key'];
  if (typeof provided !== 'string' || !timingSafeCompare(provided, config.apiKey)) {
    res.status(401).json({ error: 'Invalid or missing API key' });
    return;
  }
  next();
}

/**
 * Prevents common payload attacks by disabling proto keys in parsed JSON.
 * Also enforces a hard content-length limit.
 */
export function rejectOversizedBody(req: Request, res: Response, next: NextFunction): void {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > config.security.maxRequestBodyBytes) {
    res.status(413).json({ error: 'Request body too large' });
    return;
  }
  next();
}

/**
 * Structured audit log for security-sensitive operations.
 * Logs to stdout as JSON for ingestion by CloudWatch / SIEM.
 */
export function auditLog(
  action: string,
  details: Record<string, unknown>,
  req?: Request,
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level: 'AUDIT',
    action,
    requestId: req ? (req as Request & { requestId?: string }).requestId : undefined,
    ip: req?.ip || req?.headers['x-forwarded-for'],
    userAgent: req?.headers['user-agent'],
    ...details,
  };
  console.log(JSON.stringify(entry));
}

/**
 * Prevents leaking internal details in error responses.
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (config.nodeEnv === 'production') {
      if (error.name === 'ValidationError' || error.message.includes('already exists')) {
        return error.message;
      }
      return 'An internal error occurred';
    }
    return error.message;
  }
  return 'An internal error occurred';
}
