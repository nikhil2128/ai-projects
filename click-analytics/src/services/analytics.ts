import { getDbClient } from "../database/connection";
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

const CLICK_EVENTS_TABLE = `${config.clickhouse.database}.click_events`;

function granularityToBucketExpr(g: Granularity): string {
  switch (g) {
    case "minute":
      return "formatDateTime(toStartOfMinute(event_time), '%Y-%m-%dT%H:%i')";
    case "hour":
      return "formatDateTime(toStartOfHour(event_time), '%Y-%m-%dT%H:00')";
    case "day":
      return "formatDateTime(toDate(event_time), '%Y-%m-%d')";
    case "week":
      return "formatDateTime(toStartOfWeek(event_time), '%G-W%V')";
    case "month":
      return "formatDateTime(toStartOfMonth(event_time), '%Y-%m')";
  }
}

interface WhereClause {
  sql: string;
  params: Record<string, unknown>;
}

function buildWhereClause(query: AnalyticsQuery): WhereClause {
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (query.from) {
    conditions.push("event_time >= parseDateTime64BestEffort({from:String})");
    params.from = query.from;
  }
  if (query.to) {
    conditions.push("event_time <= parseDateTime64BestEffort({to:String})");
    params.to = query.to;
  }
  if (query.pageUrl) {
    conditions.push("page_url = {pageUrl:String}");
    params.pageUrl = query.pageUrl;
  }
  if (query.websiteId) {
    conditions.push("website_id = {websiteId:String}");
    params.websiteId = query.websiteId;
  }

  return {
    sql: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

async function queryRows<T>(
  query: string,
  queryParams: Record<string, unknown> = {}
): Promise<T[]> {
  const result = await getDbClient().query({
    query,
    format: "JSONEachRow",
    query_params: queryParams,
  });
  return result.json<T>();
}

export async function getClicksOverTime(
  query: AnalyticsQuery
): Promise<TimeSeriesPoint[]> {
  const granularity = query.granularity || "hour";
  const bucketExpr = granularityToBucketExpr(granularity);
  const { sql: where, params } = buildWhereClause(query);

  return queryRows<TimeSeriesPoint>(
    `SELECT ${bucketExpr} AS bucket,
            toInt32(count()) AS count
     FROM ${CLICK_EVENTS_TABLE}
     ${where}
     GROUP BY bucket
     ORDER BY bucket ASC`,
    params
  );
}

export async function getTopPages(
  query: AnalyticsQuery
): Promise<PageStats[]> {
  const limit = Math.min(
    query.limit || config.defaultQueryLimit,
    config.maxQueryLimit
  );
  const { sql: where, params } = buildWhereClause(query);

  return queryRows<PageStats>(
    `SELECT page_url AS "pageUrl",
            toInt32(count()) AS "totalClicks",
            toInt32(uniqExact(session_id)) AS "uniqueSessions"
     FROM ${CLICK_EVENTS_TABLE}
     ${where}
     GROUP BY page_url
     ORDER BY "totalClicks" DESC
     LIMIT {limit:UInt32}`,
    {
      ...params,
      limit,
    }
  );
}

export async function getTopElements(
  query: AnalyticsQuery
): Promise<ElementStats[]> {
  const limit = Math.min(
    query.limit || config.defaultQueryLimit,
    config.maxQueryLimit
  );
  const { sql: where, params } = buildWhereClause(query);

  return queryRows<ElementStats>(
    `SELECT element_tag   AS "elementTag",
            element_id    AS "elementId",
            element_class AS "elementClass",
            element_text  AS "elementText",
            toInt32(count()) AS "totalClicks"
     FROM ${CLICK_EVENTS_TABLE}
     ${where}
     GROUP BY element_tag, element_id, element_class, element_text
     ORDER BY "totalClicks" DESC
     LIMIT {limit:UInt32}`,
    {
      ...params,
      limit,
    }
  );
}

export async function getHeatmap(
  query: AnalyticsQuery
): Promise<HeatmapPoint[]> {
  const { sql: where, params } = buildWhereClause(query);

  const bucketSize = 5;
  return queryRows<HeatmapPoint>(
    `SELECT
       toInt32(round((toFloat64(x_pos) / greatest(toFloat64(viewport_w), 1)) * 100 / ${bucketSize}) * ${bucketSize}) AS "xPercent",
       toInt32(round((toFloat64(y_pos) / greatest(toFloat64(viewport_h), 1)) * 100 / ${bucketSize}) * ${bucketSize}) AS "yPercent",
       toInt32(count()) AS count
     FROM ${CLICK_EVENTS_TABLE}
     ${where}
     GROUP BY "xPercent", "yPercent"
     ORDER BY count DESC`,
    params
  );
}

export async function getSummary(
  query: AnalyticsQuery
): Promise<AnalyticsSummary> {
  const { sql: where, params } = buildWhereClause(query);

  const totals = await queryRows<{
    totalClicks: number;
    uniqueSessions: number;
    uniquePages: number;
  }>(
    `SELECT toInt32(count()) AS "totalClicks",
            toInt32(uniqExact(session_id)) AS "uniqueSessions",
            toInt32(uniqExact(page_url)) AS "uniquePages"
     FROM ${CLICK_EVENTS_TABLE}
     ${where}`,
    params
  );

  const limitedQuery = { ...query, limit: 10 };

  const [topPages, topElements, clicksOverTime] = await Promise.all([
    getTopPages(limitedQuery),
    getTopElements(limitedQuery),
    getClicksOverTime(query),
  ]);

  return {
    ...totals[0],
    topPages,
    topElements,
    clicksOverTime,
  };
}

function parseMetadata(
  value: string | null
): Record<string, string> | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as Record<string, string>;
  } catch {
    return undefined;
  }
}

export async function getRecentClicks(query: AnalyticsQuery) {
  const limit = Math.min(
    query.limit || config.defaultQueryLimit,
    config.maxQueryLimit
  );
  const { sql: where, params } = buildWhereClause(query);

  const rows = await queryRows<{
    id: string;
    websiteId: string;
    sessionId: string;
    pageUrl: string;
    elementTag: string;
    elementId: string | null;
    elementClass: string | null;
    elementText: string | null;
    xPos: number;
    yPos: number;
    viewportWidth: number;
    viewportHeight: number;
    referrer: string | null;
    userAgent: string | null;
    ip: string | null;
    metadata: string | null;
    createdAt: string;
  }>(
    `SELECT event_id      AS id,
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
            event_time    AS "createdAt"
     FROM ${CLICK_EVENTS_TABLE}
     ${where}
     ORDER BY event_time DESC
     LIMIT {limit:UInt32}`,
    {
      ...params,
      limit,
    }
  );

  return rows.map((row) => ({
    ...row,
    metadata: parseMetadata(row.metadata),
  }));
}
