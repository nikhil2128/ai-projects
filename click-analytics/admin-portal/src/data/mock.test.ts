import { describe, it, expect } from "vitest";
import {
  DEMO_USERS,
  authenticateUser,
  computeAnalytics,
  getAggregateAnalytics,
} from "./mock";

describe("mock data helpers", () => {
  it("authenticates users with case-insensitive emails", () => {
    const user = authenticateUser("ALEX@CLICKPULSE.DEV", "demo1234");
    expect(user?.id).toBe("usr_demo_1");
    expect(authenticateUser("alex@clickpulse.dev", "bad")).toBeNull();
  });

  it("returns website analytics and fallback defaults", () => {
    const known = computeAnalytics("ws_alpha");
    expect(known.totalClicks).toBeGreaterThan(0);
    expect(known.topPages.length).toBeGreaterThan(0);

    const unknown = computeAnalytics("missing");
    expect(unknown).toEqual({
      totalClicks: 0,
      uniqueSessions: 0,
      uniquePages: 0,
      avgClicksPerSession: 0,
      clicksOverTime: [],
      topPages: [],
      topElements: [],
      recentClicks: [],
      bounceRate: 0,
      clicksTrend: 0,
    });
  });

  it("aggregates analytics across websites", () => {
    const aggregate = getAggregateAnalytics(DEMO_USERS[0].websites.map((w) => w.id));

    expect(aggregate.totalClicks).toBeGreaterThan(1000);
    expect(aggregate.totalSessions).toBeGreaterThan(100);
    expect(aggregate.totalPages).toBeGreaterThan(5);
    expect(aggregate.clicksOverTime.length).toBeGreaterThan(0);
    const buckets = aggregate.clicksOverTime.map((p) => p.bucket);
    expect([...buckets].sort()).toEqual(buckets);
  });
});
