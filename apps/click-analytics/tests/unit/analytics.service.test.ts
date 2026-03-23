import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getClicksOverTime,
  getTopPages,
  getTopElements,
  getHeatmap,
  getSummary,
  getRecentClicks,
} from "../../src/services/analytics";

const queryMock = vi.fn();

vi.mock("../../src/database/connection", () => ({
  getDbClient: () => ({
    query: queryMock,
  }),
}));

function queryResult<T>(rows: T[]) {
  return Promise.resolve({
    json: async () => rows,
  });
}

describe("analytics service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses expected bucket expressions across all granularities", async () => {
    const cases = [
      ["minute", "toStartOfMinute"],
      ["hour", "toStartOfHour"],
      ["day", "toDate(event_time)"],
      ["week", "toStartOfWeek"],
      ["month", "toStartOfMonth"],
    ] as const;

    for (const [granularity, queryFragment] of cases) {
      queryMock.mockResolvedValueOnce(queryResult([]));
      await getClicksOverTime({ granularity, websiteId: "ws_1" });
      expect(queryMock.mock.calls.at(-1)?.[0].query).toContain(queryFragment);
      expect(queryMock.mock.calls.at(-1)?.[0].query_params).toEqual({
        websiteId: "ws_1",
      });
    }
  });

  it("builds where clauses and enforces top pages limit cap", async () => {
    queryMock.mockResolvedValueOnce(queryResult([]));

    await getTopPages({
      from: "2026-01-01",
      to: "2026-01-31",
      pageUrl: "https://example.com",
      websiteId: "ws_1",
      limit: 9999,
    });

    const call = queryMock.mock.calls[0][0];
    expect(call.query).toContain("event_time >=");
    expect(call.query).toContain("event_time <=");
    expect(call.query).toContain("page_url = {pageUrl:String}");
    expect(call.query).toContain("website_id = {websiteId:String}");
    expect(call.query_params.limit).toBe(500);
  });

  it("queries top elements and heatmap", async () => {
    queryMock.mockResolvedValueOnce(queryResult([]));
    await getTopElements({ websiteId: "ws_1", limit: 10 });
    expect(queryMock.mock.calls[0][0].query).toContain("GROUP BY element_tag");

    queryMock.mockResolvedValueOnce(queryResult([]));
    await getHeatmap({ websiteId: "ws_1" });
    expect(queryMock.mock.calls[1][0].query).toContain("\"xPercent\"");
    expect(queryMock.mock.calls[1][0].query).toContain("\"yPercent\"");
  });

  it("returns combined summary payload", async () => {
    queryMock
      .mockResolvedValueOnce(
        queryResult([
          {
            totalClicks: 100,
            uniqueSessions: 40,
            uniquePages: 10,
          },
        ])
      )
      .mockResolvedValueOnce(
        queryResult([
          {
            pageUrl: "https://example.com",
            totalClicks: 20,
            uniqueSessions: 10,
          },
        ])
      )
      .mockResolvedValueOnce(
        queryResult([
          {
            elementTag: "BUTTON",
            elementId: "cta",
            elementClass: "btn",
            elementText: "Buy",
            totalClicks: 12,
          },
        ])
      )
      .mockResolvedValueOnce(
        queryResult([
          {
            bucket: "2026-01-01T00:00",
            count: 5,
          },
        ])
      );

    const summary = await getSummary({ websiteId: "ws_1", granularity: "hour" });
    expect(summary).toEqual({
      totalClicks: 100,
      uniqueSessions: 40,
      uniquePages: 10,
      topPages: [
        {
          pageUrl: "https://example.com",
          totalClicks: 20,
          uniqueSessions: 10,
        },
      ],
      topElements: [
        {
          elementTag: "BUTTON",
          elementId: "cta",
          elementClass: "btn",
          elementText: "Buy",
          totalClicks: 12,
        },
      ],
      clicksOverTime: [
        {
          bucket: "2026-01-01T00:00",
          count: 5,
        },
      ],
    });
  });

  it("parses metadata in recent clicks safely", async () => {
    queryMock.mockResolvedValueOnce(
      queryResult([
        {
          id: "evt_1",
          websiteId: "ws_1",
          sessionId: "sess_1",
          pageUrl: "https://example.com",
          elementTag: "BUTTON",
          elementId: null,
          elementClass: null,
          elementText: null,
          xPos: 1,
          yPos: 2,
          viewportWidth: 1200,
          viewportHeight: 900,
          referrer: null,
          userAgent: null,
          ip: null,
          metadata: "{\"a\":\"b\"}",
          createdAt: "2026-01-01",
        },
        {
          id: "evt_2",
          websiteId: "ws_1",
          sessionId: "sess_2",
          pageUrl: "https://example.com",
          elementTag: "A",
          elementId: null,
          elementClass: null,
          elementText: null,
          xPos: 3,
          yPos: 4,
          viewportWidth: 1200,
          viewportHeight: 900,
          referrer: null,
          userAgent: null,
          ip: null,
          metadata: "{bad json}",
          createdAt: "2026-01-01",
        },
      ])
    );

    const rows = await getRecentClicks({ websiteId: "ws_1" });
    expect(rows[0].metadata).toEqual({ a: "b" });
    expect(rows[1].metadata).toBeUndefined();
  });
});
