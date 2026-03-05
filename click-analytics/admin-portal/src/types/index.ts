export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  company: string;
  avatar: string;
  websites: Website[];
}

export interface Website {
  id: string;
  domain: string;
  name: string;
  favicon: string;
  addedAt: string;
  status: "active" | "paused";
}

export interface ClickEvent {
  id: string;
  websiteId: string;
  sessionId: string;
  pageUrl: string;
  elementTag: string;
  elementId?: string;
  elementClass?: string;
  elementText?: string;
  xPos: number;
  yPos: number;
  viewportWidth: number;
  viewportHeight: number;
  referrer?: string;
  userAgent?: string;
  eventTime: string;
}

export interface TimeSeriesPoint {
  bucket: string;
  count: number;
}

export interface PageStats {
  pageUrl: string;
  totalClicks: number;
  uniqueSessions: number;
}

export interface ElementStats {
  elementTag: string;
  elementId: string | null;
  elementClass: string | null;
  elementText: string | null;
  totalClicks: number;
}

export interface WebsiteAnalytics {
  totalClicks: number;
  uniqueSessions: number;
  uniquePages: number;
  avgClicksPerSession: number;
  clicksOverTime: TimeSeriesPoint[];
  topPages: PageStats[];
  topElements: ElementStats[];
  recentClicks: ClickEvent[];
  bounceRate: number;
  clicksTrend: number;
}

export interface AuthState {
  user: Omit<User, "password"> | null;
  isAuthenticated: boolean;
}
