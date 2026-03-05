import { z } from "zod";

export const ClickEventSchema = z.object({
  websiteId: z.string().min(1).optional(),
  sessionId: z.string().min(1),
  pageUrl: z.string().url(),
  elementTag: z.string().min(1),
  elementId: z.string().optional(),
  elementClass: z.string().optional(),
  elementText: z.string().max(500).optional(),
  xPos: z.number().int().nonnegative(),
  yPos: z.number().int().nonnegative(),
  viewportWidth: z.number().int().positive(),
  viewportHeight: z.number().int().positive(),
  referrer: z.string().optional(),
  userAgent: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

export type ClickEventInput = z.infer<typeof ClickEventSchema>;

export interface ClickEvent extends ClickEventInput {
  id: string;
  createdAt: string;
  ip: string | null;
}

export interface QueuedEvent {
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
  ip: string | null;
  metadata?: Record<string, string>;
  receivedAt: string;
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

export interface HeatmapPoint {
  xPercent: number;
  yPercent: number;
  count: number;
}

export interface AnalyticsSummary {
  totalClicks: number;
  uniqueSessions: number;
  uniquePages: number;
  topPages: PageStats[];
  topElements: ElementStats[];
  clicksOverTime: TimeSeriesPoint[];
}

export type Granularity = "minute" | "hour" | "day" | "week" | "month";

export interface AnalyticsQuery {
  from?: string;
  to?: string;
  pageUrl?: string;
  websiteId?: string;
  granularity?: Granularity;
  limit?: number;
}
