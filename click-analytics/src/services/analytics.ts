import { getPool } from "../database/connection";
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

function granularityToFormat(g: Granularity): string {
  switch (g) {
    case "minute":
      return 'YYYY-MM-DD"T"HH24:MI';
    case "hour":
      return 'YYYY-MM-DD"T"HH24:00';
    case "day":
      return "YYYY-MM-DD";
    case "week":
      return 'IYYY-"W"IW';
    case "month":
      return "YYYY-MM";
  }
}

interface WhereClause {
  sql: string;
  params: unknown[];
  nextIdx: number;
}

function buildWhereClause(query: AnalyticsQuery, startIdx = 1): WhereClause {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = startIdx;

  if (query.from) {
    conditions.push(`created_at >= $${idx++}`);
    params.push(query.from);
  }
  if (query.to) {
    conditions.push(`created_at <= $${idx++}`);
    params.push(query.to);
  }
  if (query.pageUrl) {
    conditions.push(`page_url = $${idx++}`);
    params.push(query.pageUrl);
  }
  if (query.websiteId) {
    conditions.push(`website_id = $${idx++}`);
    params.push(query.websiteId);
  }

  return {
    sql: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
    nextIdx: idx,
  };
}

export async function getClicksOverTime(
  query: AnalyticsQuery
): Promise<TimeSeriesPoint[]> {
  const pool = getPool();
  const granularity = query.granularity || "hour";
  const format = granularityToFormat(granularity);
  const { sql: where, params } = buildWhereClause(query);

  const result = await pool.query(
    `SELECT to_char(created_at, '${format}') AS bucket,
            COUNT(*)::int AS count
     FROM click_events ${where}
     GROUP BY bucket ORDER BY bucket ASC`,
    params
  );
  return result.rows;
}

export async function getTopPages(
  query: AnalyticsQuery
): Promise<PageStats[]> {
  const pool = getPool();
  const limit = Math.min(
    query.limit || config.defaultQueryLimit,
    config.maxQueryLimit
  );
  const { sql: where, params, nextIdx } = buildWhereClause(query);

  const result = await pool.query(
    `SELECT page_url AS "pageUrl",
            COUNT(*)::int AS "totalClicks",
            COUNT(DISTINCT session_id)::int AS "uniqueSessions"
     FROM click_events ${where}
     GROUP BY page_url
     ORDER BY "totalClicks" DESC
     LIMIT $${nextIdx}`,
    [...params, limit]
  );
  return result.rows;
}

export async function getTopElements(
  query: AnalyticsQuery
): Promise<ElementStats[]> {
  const pool = getPool();
  const limit = Math.min(
    query.limit || config.defaultQueryLimit,
    config.maxQueryLimit
  );
  const { sql: where, params, nextIdx } = buildWhereClause(query);

  const result = await pool.query(
    `SELECT element_tag   AS "elementTag",
            element_id    AS "elementId",
            element_class AS "elementClass",
            element_text  AS "elementText",
            COUNT(*)::int AS "totalClicks"
     FROM click_events ${where}
     GROUP BY element_tag, element_id, element_class, element_text
     ORDER BY "totalClicks" DESC
     LIMIT $${nextIdx}`,
    [...params, limit]
  );
  return result.rows;
}

export async function getHeatmap(
  query: AnalyticsQuery
): Promise<HeatmapPoint[]> {
  const pool = getPool();
  const { sql: where, params } = buildWhereClause(query);

  const bucketSize = 5;
  const result = await pool.query(
    `SELECT
       (ROUND(x_pos::numeric / viewport_w * 100 / ${bucketSize}) * ${bucketSize})::int AS "xPercent",
       (ROUND(y_pos::numeric / viewport_h * 100 / ${bucketSize}) * ${bucketSize})::int AS "yPercent",
       COUNT(*)::int AS count
     FROM click_events ${where}
     GROUP BY "xPercent", "yPercent"
     ORDER BY count DESC`,
    params
  );
  return result.rows;
}

export async function getSummary(
  query: AnalyticsQuery
): Promise<AnalyticsSummary> {
  const pool = getPool();
  const { sql: where, params } = buildWhereClause(query);

  const totals = await pool.query(
    `SELECT COUNT(*)::int                AS "totalClicks",
            COUNT(DISTINCT session_id)::int AS "uniqueSessions",
            COUNT(DISTINCT page_url)::int   AS "uniquePages"
     FROM click_events ${where}`,
    params
  );

  const limitedQuery = { ...query, limit: 10 };

  const [topPages, topElements, clicksOverTime] = await Promise.all([
    getTopPages(limitedQuery),
    getTopElements(limitedQuery),
    getClicksOverTime(query),
  ]);

  return {
    ...totals.rows[0],
    topPages,
    topElements,
    clicksOverTime,
  };
}

export async function getRecentClicks(query: AnalyticsQuery) {
  const pool = getPool();
  const limit = Math.min(
    query.limit || config.defaultQueryLimit,
    config.maxQueryLimit
  );
  const { sql: where, params, nextIdx } = buildWhereClause(query);

  const result = await pool.query(
    `SELECT id,
            website_id    AS "websiteId",
            session_id    AS "sessionId",
            page_url      AS "pageUrl",
            element_tag   AS "elementTag",
            element_id    AS "elementId",
            element_class AS "elementClass",
            element_text  AS "elementText",
            x_pos         AS "xPos",
            y_pos         AS "yPos",
            viewport_w    AS "viewportWidth",
            viewport_h    AS "viewportHeight",
            referrer,
            user_agent    AS "userAgent",
            ip,
            metadata,
            created_at    AS "createdAt"
     FROM click_events ${where}
     ORDER BY created_at DESC
     LIMIT $${nextIdx}`,
    [...params, limit]
  );
  return result.rows;
}
