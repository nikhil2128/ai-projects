import { getDbClient } from "../database/connection";
import { config } from "../config";
import { randomUUID } from "crypto";

const TABLE = `${config.clickhouse.database}.click_events`;

const WEBSITE_ID = "demo.example.com";

const PAGES = [
  "/",
  "/about",
  "/pricing",
  "/products",
  "/products/widget-pro",
  "/products/analytics-suite",
  "/blog",
  "/blog/getting-started",
  "/blog/advanced-tips",
  "/blog/release-notes",
  "/contact",
  "/docs",
  "/docs/api-reference",
  "/login",
  "/signup",
];

const ELEMENTS: { tag: string; id?: string; cls?: string; text?: string }[] = [
  { tag: "BUTTON", id: "cta-primary", cls: "btn btn-primary", text: "Get Started" },
  { tag: "BUTTON", id: "cta-demo", cls: "btn btn-outline", text: "Book a Demo" },
  { tag: "A", id: "nav-home", cls: "nav-link", text: "Home" },
  { tag: "A", id: "nav-pricing", cls: "nav-link", text: "Pricing" },
  { tag: "A", id: "nav-products", cls: "nav-link", text: "Products" },
  { tag: "A", id: "nav-blog", cls: "nav-link", text: "Blog" },
  { tag: "A", id: "nav-docs", cls: "nav-link", text: "Docs" },
  { tag: "A", cls: "footer-link", text: "Privacy Policy" },
  { tag: "A", cls: "footer-link", text: "Terms of Service" },
  { tag: "A", cls: "blog-card-link", text: "Read More" },
  { tag: "BUTTON", id: "login-submit", cls: "btn btn-primary", text: "Log In" },
  { tag: "BUTTON", id: "signup-submit", cls: "btn btn-primary", text: "Sign Up" },
  { tag: "INPUT", id: "search-input", cls: "search-box" },
  { tag: "DIV", id: "hero-banner", cls: "hero" },
  { tag: "IMG", cls: "product-image" },
  { tag: "BUTTON", id: "add-to-cart", cls: "btn btn-success", text: "Add to Cart" },
  { tag: "A", cls: "breadcrumb-link", text: "Back" },
  { tag: "BUTTON", id: "toggle-theme", cls: "icon-btn" },
  { tag: "SELECT", id: "plan-selector", cls: "form-select" },
  { tag: "BUTTON", id: "contact-submit", cls: "btn btn-primary", text: "Send Message" },
];

const REFERRERS = [
  "https://www.google.com/",
  "https://twitter.com/",
  "https://www.linkedin.com/",
  "https://www.reddit.com/",
  "https://news.ycombinator.com/",
  null,
  null,
  null,
];

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/119.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/17.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
];

const VIEWPORTS = [
  { w: 1920, h: 1080 },
  { w: 1440, h: 900 },
  { w: 1366, h: 768 },
  { w: 390, h: 844 },
  { w: 414, h: 896 },
  { w: 375, h: 812 },
  { w: 1536, h: 864 },
  { w: 768, h: 1024 },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomIP(): string {
  return `${randomInt(10, 200)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`;
}

function generateEvents(count: number): string[] {
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const sessionCount = Math.max(20, Math.floor(count / 8));
  const sessions = Array.from({ length: sessionCount }, () => randomUUID());

  const rows: string[] = [];

  for (let i = 0; i < count; i++) {
    const viewport = pick(VIEWPORTS);
    const elem = pick(ELEMENTS);
    const page = pick(PAGES);
    const session = pick(sessions);
    const referrer = pick(REFERRERS);
    const ua = pick(USER_AGENTS);
    const ip = randomIP();

    const eventTime = new Date(now - Math.random() * thirtyDaysMs);

    const hourWeight = eventTime.getUTCHours();
    if (hourWeight >= 2 && hourWeight <= 6 && Math.random() < 0.6) {
      eventTime.setUTCHours(randomInt(9, 22));
    }

    const xPos = randomInt(0, viewport.w);
    const yPos = randomInt(0, viewport.h);

    const row = JSON.stringify({
      event_id: randomUUID(),
      website_id: WEBSITE_ID,
      session_id: session,
      page_url: `https://${WEBSITE_ID}${page}`,
      element_tag: elem.tag,
      element_id: elem.id || null,
      element_class: elem.cls || null,
      element_text: elem.text || null,
      x_pos: xPos,
      y_pos: yPos,
      viewport_w: viewport.w,
      viewport_h: viewport.h,
      referrer: referrer,
      user_agent: ua,
      ip,
      metadata: null,
      event_time: eventTime.toISOString().replace("T", " ").replace("Z", ""),
    });

    rows.push(row);
  }

  return rows;
}

export async function seedSampleData(
  eventCount: number = 2000
): Promise<{ inserted: number }> {
  const client = getDbClient();
  const rows = generateEvents(eventCount);
  const batchSize = 500;

  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await client.insert({
      table: TABLE,
      values: batch.map((r) => JSON.parse(r)),
      format: "JSONEachRow",
    });
    inserted += batch.length;
  }

  return { inserted };
}
