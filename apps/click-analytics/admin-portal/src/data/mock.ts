import type {
  ClickEvent,
  PageStats,
  ElementStats,
  TimeSeriesPoint,
  User,
  WebsiteAnalytics,
} from "../types";

function isoDay(offset: number): string {
  const d = new Date(Date.UTC(2026, 0, 1 + offset, 12, 0, 0));
  return d.toISOString();
}

function makeSeries(seed: number): TimeSeriesPoint[] {
  return Array.from({ length: 7 }, (_, i) => ({
    bucket: isoDay(i),
    count: seed + i * 7,
  }));
}

function makePages(domain: string): PageStats[] {
  return [
    { pageUrl: `https://${domain}/`, totalClicks: 420, uniqueSessions: 120 },
    { pageUrl: `https://${domain}/pricing`, totalClicks: 210, uniqueSessions: 87 },
    { pageUrl: `https://${domain}/about`, totalClicks: 95, uniqueSessions: 50 },
  ];
}

function makeElements(): ElementStats[] {
  return [
    {
      elementTag: "BUTTON",
      elementId: "cta-primary",
      elementClass: "btn btn-primary",
      elementText: "Get Started",
      totalClicks: 255,
    },
    {
      elementTag: "A",
      elementId: "nav-pricing",
      elementClass: "nav-link",
      elementText: "Pricing",
      totalClicks: 144,
    },
    {
      elementTag: "BUTTON",
      elementId: "signup-submit",
      elementClass: "btn btn-primary",
      elementText: "Create account",
      totalClicks: 88,
    },
  ];
}

function makeClicks(websiteId: string, domain: string): ClickEvent[] {
  return Array.from({ length: 8 }, (_, i) => ({
    id: `evt_${websiteId}_${i}`,
    websiteId,
    sessionId: `session_${i + 1}`,
    pageUrl: `https://${domain}${i % 2 === 0 ? "/" : "/pricing"}`,
    elementTag: i % 2 === 0 ? "BUTTON" : "A",
    elementId: i % 2 === 0 ? "cta-primary" : "nav-pricing",
    elementClass: i % 2 === 0 ? "btn btn-primary" : "nav-link",
    elementText: i % 2 === 0 ? "Get Started" : "Pricing",
    xPos: 80 + i * 10,
    yPos: 120 + i * 8,
    viewportWidth: 1440,
    viewportHeight: 900,
    referrer: "https://google.com",
    userAgent: "Mozilla/5.0",
    eventTime: new Date(Date.UTC(2026, 0, 10, 12, i, 0)).toISOString(),
  }));
}

export const DEMO_USERS: User[] = [
  {
    id: "usr_demo_1",
    name: "Alex Johnson",
    email: "alex@clickpulse.dev",
    password: "demo1234",
    company: "ClickPulse Labs",
    avatar: "AJ",
    websites: [
      {
        id: "ws_alpha",
        domain: "alpha.example.com",
        name: "Alpha",
        favicon: "A",
        addedAt: "2025-01-01",
        status: "active",
      },
      {
        id: "ws_beta",
        domain: "beta.example.com",
        name: "Beta",
        favicon: "B",
        addedAt: "2025-03-15",
        status: "active",
      },
    ],
  },
  {
    id: "usr_demo_2",
    name: "Morgan Lee",
    email: "morgan@clickpulse.dev",
    password: "demo1234",
    company: "Northwind",
    avatar: "ML",
    websites: [
      {
        id: "ws_gamma",
        domain: "gamma.example.com",
        name: "Gamma",
        favicon: "G",
        addedAt: "2025-02-10",
        status: "paused",
      },
    ],
  },
];

const analyticsByWebsite: Record<string, WebsiteAnalytics> = {
  ws_alpha: {
    totalClicks: 1220,
    uniqueSessions: 320,
    uniquePages: 9,
    avgClicksPerSession: 4,
    clicksOverTime: makeSeries(80),
    topPages: makePages("alpha.example.com"),
    topElements: makeElements(),
    recentClicks: makeClicks("ws_alpha", "alpha.example.com"),
    bounceRate: 34,
    clicksTrend: 11,
  },
  ws_beta: {
    totalClicks: 890,
    uniqueSessions: 240,
    uniquePages: 7,
    avgClicksPerSession: 4,
    clicksOverTime: makeSeries(55),
    topPages: makePages("beta.example.com"),
    topElements: makeElements(),
    recentClicks: makeClicks("ws_beta", "beta.example.com"),
    bounceRate: 39,
    clicksTrend: 6,
  },
  ws_gamma: {
    totalClicks: 460,
    uniqueSessions: 130,
    uniquePages: 5,
    avgClicksPerSession: 4,
    clicksOverTime: makeSeries(30),
    topPages: makePages("gamma.example.com"),
    topElements: makeElements(),
    recentClicks: makeClicks("ws_gamma", "gamma.example.com"),
    bounceRate: 44,
    clicksTrend: -4,
  },
};

export function authenticateUser(email: string, password: string): User | null {
  return (
    DEMO_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    ) ?? null
  );
}

export function computeAnalytics(websiteId: string): WebsiteAnalytics {
  return (
    analyticsByWebsite[websiteId] ?? {
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
    }
  );
}

export function getAggregateAnalytics(websiteIds: string[]) {
  const stats = websiteIds.map(computeAnalytics);
  const clickBuckets = new Map<string, number>();

  for (const stat of stats) {
    for (const point of stat.clicksOverTime) {
      clickBuckets.set(point.bucket, (clickBuckets.get(point.bucket) || 0) + point.count);
    }
  }

  return {
    totalClicks: stats.reduce((sum, s) => sum + s.totalClicks, 0),
    totalSessions: stats.reduce((sum, s) => sum + s.uniqueSessions, 0),
    totalPages: stats.reduce((sum, s) => sum + s.uniquePages, 0),
    clicksOverTime: Array.from(clickBuckets.entries())
      .map(([bucket, count]) => ({ bucket, count }))
      .sort((a, b) => a.bucket.localeCompare(b.bucket)),
  };
}
