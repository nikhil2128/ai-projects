import { getDb } from "../database/connection";
import type {
  AnalyticsQuery,
  AnalyticsSummary,
  ElementStats,
  Granularity,
  HeatmapPoint,
  PageStats,
  TimeSeriesPoint,
} from "../types";
import { config } from "../config";

function granularityToSqlite(g: Granularity): string {
  switch (g) {
    case "minute":
      return "%Y-%m-%dT%H:%M";
    case "hour":
      return "%Y-%m-%dT%H:00";
    case "day":
      return "%Y-%m-%d";
    case "week":
      return "%Y-W%W";
    case "month":
      return "%Y-%m";
  }
}

interface WhereClause {
  sql: string;
  params: Record<string, string>;
}

function buildWhereClause(query: AnalyticsQuery): WhereClause {
  const conditions: string[] = [];
  const params: Record<string, string> = {};

  if (query.from) {
    conditions.push("created_at >= @from");
    params.from = query.from;
  }
  if (query.to) {
    conditions.push("created_at <= @to");
    params.to = query.to;
  }
  if (query.pageUrl) {
    conditions.push("page_url = @pageUrl");
    params.pageUrl = query.pageUrl;
  }

  return {
    sql: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

export function getClicksOverTime(query: AnalyticsQuery): TimeSeriesPoint[] {
  const db = getDb();
  const granularity = query.granularity || "hour";
  const format = granularityToSqlite(granularity);
  const { sql: where, params } = buildWhereClause(query);

  const rows = db
    .prepare(
      `SELECT strftime('${format}', created_at) AS bucket, COUNT(*) AS count
       FROM click_events ${where}
       GROUP BY bucket ORDER BY bucket ASC`
    )
    .all(params) as TimeSeriesPoint[];

  return rows;
}

export function getTopPages(query: AnalyticsQuery): PageStats[] {
  const db = getDb();
  const limit = Math.min(query.limit || config.defaultQueryLimit, config.maxQueryLimit);
  const { sql: where, params } = buildWhereClause(query);

  const rows = db
    .prepare(
      `SELECT page_url AS pageUrl,
              COUNT(*) AS totalClicks,
              COUNT(DISTINCT session_id) AS uniqueSessions
       FROM click_events ${where}
       GROUP BY page_url
       ORDER BY totalClicks DESC
       LIMIT @limit`
    )
    .all({ ...params, limit }) as PageStats[];

  return rows;
}

export function getTopElements(query: AnalyticsQuery): ElementStats[] {
  const db = getDb();
  const limit = Math.min(query.limit || config.defaultQueryLimit, config.maxQueryLimit);
  const { sql: where, params } = buildWhereClause(query);

  const rows = db
    .prepare(
      `SELECT element_tag   AS elementTag,
              element_id    AS elementId,
              element_class AS elementClass,
              element_text  AS elementText,
              COUNT(*)      AS totalClicks
       FROM click_events ${where}
       GROUP BY element_tag, element_id, element_class, element_text
       ORDER BY totalClicks DESC
       LIMIT @limit`
    )
    .all({ ...params, limit }) as ElementStats[];

  return rows;
}

export function getHeatmap(query: AnalyticsQuery): HeatmapPoint[] {
  const db = getDb();
  const { sql: where, params } = buildWhereClause(query);

  const bucketSize = 5;
  const rows = db
    .prepare(
      `SELECT
         CAST(ROUND(CAST(x_pos AS REAL) / viewport_w * 100 / ${bucketSize}) * ${bucketSize} AS INTEGER) AS xPercent,
         CAST(ROUND(CAST(y_pos AS REAL) / viewport_h * 100 / ${bucketSize}) * ${bucketSize} AS INTEGER) AS yPercent,
         COUNT(*) AS count
       FROM click_events ${where}
       GROUP BY xPercent, yPercent
       ORDER BY count DESC`
    )
    .all(params) as HeatmapPoint[];

  return rows;
}

export function getSummary(query: AnalyticsQuery): AnalyticsSummary {
  const db = getDb();
  const { sql: where, params } = buildWhereClause(query);

  const totals = db
    .prepare(
      `SELECT COUNT(*) AS totalClicks,
              COUNT(DISTINCT session_id) AS uniqueSessions,
              COUNT(DISTINCT page_url)   AS uniquePages
       FROM click_events ${where}`
    )
    .get(params) as { totalClicks: number; uniqueSessions: number; uniquePages: number };

  const limitedQuery = { ...query, limit: 10 };

  return {
    ...totals,
    topPages: getTopPages(limitedQuery),
    topElements: getTopElements(limitedQuery),
    clicksOverTime: getClicksOverTime(query),
  };
}

export function getRecentClicks(query: AnalyticsQuery) {
  const db = getDb();
  const limit = Math.min(query.limit || config.defaultQueryLimit, config.maxQueryLimit);
  const { sql: where, params } = buildWhereClause(query);

  return db
    .prepare(
      `SELECT id, session_id AS sessionId, page_url AS pageUrl,
              element_tag AS elementTag, element_id AS elementId,
              element_class AS elementClass, element_text AS elementText,
              x_pos AS xPos, y_pos AS yPos,
              viewport_w AS viewportWidth, viewport_h AS viewportHeight,
              referrer, user_agent AS userAgent, ip, metadata, created_at AS createdAt
       FROM click_events ${where}
       ORDER BY created_at DESC
       LIMIT @limit`
    )
    .all({ ...params, limit });
}
