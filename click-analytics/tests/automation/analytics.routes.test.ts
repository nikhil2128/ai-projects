import express from "express";
import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import analyticsRoutes from "../../src/routes/analytics";
import { errorHandler } from "../../src/middleware/errorHandler";

const {
  getSummaryMock,
  getClicksOverTimeMock,
  getTopPagesMock,
  getTopElementsMock,
  getHeatmapMock,
  getRecentClicksMock,
} = vi.hoisted(() => ({
  getSummaryMock: vi.fn(),
  getClicksOverTimeMock: vi.fn(),
  getTopPagesMock: vi.fn(),
  getTopElementsMock: vi.fn(),
  getHeatmapMock: vi.fn(),
  getRecentClicksMock: vi.fn(),
}));

vi.mock("../../src/middleware/auth", () => ({
  requireSecretKey: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.websiteId = "ws_secret";
    next();
  },
}));

vi.mock("../../src/services/analytics", () => ({
  getSummary: getSummaryMock,
  getClicksOverTime: getClicksOverTimeMock,
  getTopPages: getTopPagesMock,
  getTopElements: getTopElementsMock,
  getHeatmap: getHeatmapMock,
  getRecentClicks: getRecentClicksMock,
}));

function buildApp() {
  const app = express();
  app.use("/api/analytics", analyticsRoutes);
  app.use(errorHandler);
  return app;
}

describe("analytics routes automation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSummaryMock.mockResolvedValue({ totalClicks: 1 });
    getClicksOverTimeMock.mockResolvedValue([{ bucket: "2026-01-01", count: 1 }]);
    getTopPagesMock.mockResolvedValue([]);
    getTopElementsMock.mockResolvedValue([]);
    getHeatmapMock.mockResolvedValue([]);
    getRecentClicksMock.mockResolvedValue([]);
  });

  it("maps query params for summary endpoint", async () => {
    const app = buildApp();

    const res = await request(app).get(
      "/api/analytics/summary?from=2026-01-01&to=2026-01-31&pageUrl=https://example.com&granularity=day&limit=25"
    );

    expect(res.status).toBe(200);
    expect(getSummaryMock).toHaveBeenCalledWith({
      from: "2026-01-01",
      to: "2026-01-31",
      pageUrl: "https://example.com",
      websiteId: "ws_secret",
      granularity: "day",
      limit: 25,
    });
  });

  it("uses default granularity when missing", async () => {
    const app = buildApp();

    const res = await request(app).get("/api/analytics/clicks-over-time");

    expect(res.status).toBe(200);
    expect(getClicksOverTimeMock).toHaveBeenCalledWith({
      from: undefined,
      to: undefined,
      pageUrl: undefined,
      websiteId: "ws_secret",
      granularity: "hour",
      limit: undefined,
    });
  });

  it("serves top pages, top elements, heatmap and recent clicks", async () => {
    const app = buildApp();

    await request(app).get("/api/analytics/top-pages?limit=5");
    await request(app).get("/api/analytics/top-elements?limit=3");
    await request(app).get("/api/analytics/heatmap");
    await request(app).get("/api/analytics/recent");

    expect(getTopPagesMock).toHaveBeenCalledTimes(1);
    expect(getTopElementsMock).toHaveBeenCalledTimes(1);
    expect(getHeatmapMock).toHaveBeenCalledTimes(1);
    expect(getRecentClicksMock).toHaveBeenCalledTimes(1);
  });

  it("forwards service errors to error handler", async () => {
    const app = buildApp();
    getTopPagesMock.mockRejectedValueOnce(new Error("db failed"));

    const res = await request(app).get("/api/analytics/top-pages");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Internal server error" });
  });
});
