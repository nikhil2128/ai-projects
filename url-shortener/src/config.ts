export interface Config {
  port: number;
  host: string;
  baseUrl: string;
  dbPath: string;
  cacheMaxSize: number;
  cacheTtlMs: number;
  rateLimitMax: number;
  rateLimitWindowMs: number;
  shortCodeLength: number;
}

function envInt(key: string, fallback: number): number {
  const v = process.env[key];
  return v ? parseInt(v, 10) : fallback;
}

function envStr(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export function loadConfig(): Config {
  const port = envInt("PORT", 3100);
  const host = envStr("HOST", "0.0.0.0");

  return {
    port,
    host,
    baseUrl: envStr("BASE_URL", `http://localhost:${port}`),
    dbPath: envStr("DB_PATH", "./data/urls.db"),
    cacheMaxSize: envInt("CACHE_MAX_SIZE", 50_000),
    cacheTtlMs: envInt("CACHE_TTL_MS", 3_600_000), // 1 hour
    rateLimitMax: envInt("RATE_LIMIT_MAX", 100),
    rateLimitWindowMs: envInt("RATE_LIMIT_WINDOW_MS", 60_000), // 1 minute
    shortCodeLength: envInt("SHORT_CODE_LENGTH", 7),
  };
}
