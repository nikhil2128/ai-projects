import { Router } from "express";
import type { AnalyticsQuery, Granularity } from "../types";
import {
  getSummary,
  getClicksOverTime,
  getTopPages,
  getTopElements,
  getHeatmap,
  getRecentClicks,
} from "../services/analytics";

const router = Router();

function parseQuery(raw: Record<string, unknown>): AnalyticsQuery {
  return {
    from: raw.from as string | undefined,
    to: raw.to as string | undefined,
    pageUrl: raw.pageUrl as string | undefined,
    granularity: (raw.granularity as Granularity) || "hour",
    limit: raw.limit ? parseInt(raw.limit as string, 10) : undefined,
  };
}

router.get("/summary", (req, res) => {
  const query = parseQuery(req.query as Record<string, unknown>);
  res.json(getSummary(query));
});

router.get("/clicks-over-time", (req, res) => {
  const query = parseQuery(req.query as Record<string, unknown>);
  res.json(getClicksOverTime(query));
});

router.get("/top-pages", (req, res) => {
  const query = parseQuery(req.query as Record<string, unknown>);
  res.json(getTopPages(query));
});

router.get("/top-elements", (req, res) => {
  const query = parseQuery(req.query as Record<string, unknown>);
  res.json(getTopElements(query));
});

router.get("/heatmap", (req, res) => {
  const query = parseQuery(req.query as Record<string, unknown>);
  res.json(getHeatmap(query));
});

router.get("/recent", (req, res) => {
  const query = parseQuery(req.query as Record<string, unknown>);
  res.json(getRecentClicks(query));
});

export default router;
