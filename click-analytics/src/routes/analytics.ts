import { Router } from "express";
import type { AnalyticsQuery, Granularity } from "../types";
import { requireSecretKey } from "../middleware/auth";
import {
  getSummary,
  getClicksOverTime,
  getTopPages,
  getTopElements,
  getHeatmap,
  getRecentClicks,
} from "../services/analytics";

const router = Router();

router.use(requireSecretKey);

function parseQuery(
  raw: Record<string, unknown>,
  websiteId: string
): AnalyticsQuery {
  return {
    from: raw.from as string | undefined,
    to: raw.to as string | undefined,
    pageUrl: raw.pageUrl as string | undefined,
    websiteId,
    granularity: (raw.granularity as Granularity) || "hour",
    limit: raw.limit ? parseInt(raw.limit as string, 10) : undefined,
  };
}

router.get("/summary", async (req, res, next) => {
  try {
    const query = parseQuery(
      req.query as Record<string, unknown>,
      req.websiteId!
    );
    res.json(await getSummary(query));
  } catch (err) {
    next(err);
  }
});

router.get("/clicks-over-time", async (req, res, next) => {
  try {
    const query = parseQuery(
      req.query as Record<string, unknown>,
      req.websiteId!
    );
    res.json(await getClicksOverTime(query));
  } catch (err) {
    next(err);
  }
});

router.get("/top-pages", async (req, res, next) => {
  try {
    const query = parseQuery(
      req.query as Record<string, unknown>,
      req.websiteId!
    );
    res.json(await getTopPages(query));
  } catch (err) {
    next(err);
  }
});

router.get("/top-elements", async (req, res, next) => {
  try {
    const query = parseQuery(
      req.query as Record<string, unknown>,
      req.websiteId!
    );
    res.json(await getTopElements(query));
  } catch (err) {
    next(err);
  }
});

router.get("/heatmap", async (req, res, next) => {
  try {
    const query = parseQuery(
      req.query as Record<string, unknown>,
      req.websiteId!
    );
    res.json(await getHeatmap(query));
  } catch (err) {
    next(err);
  }
});

router.get("/recent", async (req, res, next) => {
  try {
    const query = parseQuery(
      req.query as Record<string, unknown>,
      req.websiteId!
    );
    res.json(await getRecentClicks(query));
  } catch (err) {
    next(err);
  }
});

export default router;
