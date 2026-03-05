import type { Request, Response, NextFunction } from "express";
import { lookupBySiteKey, lookupBySecretKey } from "../services/apikeys";
import { config } from "../config";

function extractOriginDomain(req: Request): string | null {
  const origin = req.headers["origin"];
  const referer = req.headers["referer"];

  const raw = origin || referer;
  if (!raw) return null;

  try {
    return new URL(raw as string).hostname;
  } catch {
    return null;
  }
}

function domainMatches(actual: string, allowed: string): boolean {
  if (allowed === actual) return true;
  if (allowed.startsWith("*.")) {
    const suffix = allowed.slice(1);
    return actual.endsWith(suffix) || actual === allowed.slice(2);
  }
  return false;
}

/**
 * Validates the public site key (sent via x-site-key header) and
 * checks the request Origin/Referer against the website's allowed domains.
 *
 * On success, sets req.websiteId and req.website for downstream handlers.
 * The websiteId is always derived from the site key — never from the client body —
 * so one website owner cannot impersonate another.
 */
export function requireSiteKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const siteKey = req.headers["x-site-key"] as string | undefined;

  if (!siteKey) {
    res.status(401).json({ error: "Missing x-site-key header" });
    return;
  }

  lookupBySiteKey(siteKey)
    .then((website) => {
      if (!website) {
        res.status(401).json({ error: "Invalid site key" });
        return;
      }

      const originDomain = extractOriginDomain(req);

      // In browser contexts Origin/Referer is always present.
      // For server-to-server calls without Origin, allow if the secret key
      // is also provided (fallback for non-browser clients like curl/Postman).
      if (!originDomain) {
        const secretKey = req.headers["x-api-key"] as string | undefined;
        if (!secretKey || secretKey !== website.secret_key) {
          res.status(403).json({
            error:
              "Origin header missing. For server-to-server calls, include x-api-key (secret key) alongside x-site-key.",
          });
          return;
        }
      } else {
        const allowed = website.allowed_domains.some((d) =>
          domainMatches(originDomain, d)
        );
        if (!allowed) {
          res.status(403).json({
            error: `Origin "${originDomain}" is not in the allowed domains for this site key`,
          });
          return;
        }
      }

      req.websiteId = website.id;
      req.website = website;
      next();
    })
    .catch(next);
}

/**
 * Validates the secret API key (x-api-key header) for server-side endpoints
 * like analytics. Sets req.websiteId and req.website.
 */
export function requireSecretKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const secretKey = req.headers["x-api-key"] as string | undefined;

  if (!secretKey) {
    res.status(401).json({ error: "Missing x-api-key header" });
    return;
  }

  lookupBySecretKey(secretKey)
    .then((website) => {
      if (!website) {
        res.status(401).json({ error: "Invalid API key" });
        return;
      }

      req.websiteId = website.id;
      req.website = website;
      next();
    })
    .catch(next);
}

/**
 * Validates the admin API key for website management endpoints.
 */
export function requireAdminKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const key = req.headers["x-admin-key"] as string | undefined;

  if (!key || key !== config.adminApiKey) {
    res.status(401).json({ error: "Invalid or missing admin key" });
    return;
  }

  next();
}
