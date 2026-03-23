import { ClickHouseClient, createClient } from "@clickhouse/client";
import { config } from "../config";

let clickhouseClient: ClickHouseClient | null = null;

export function getDbClient(): ClickHouseClient {
  if (clickhouseClient) return clickhouseClient;

  clickhouseClient = createClient({
    url: config.clickhouse.url,
    username: config.clickhouse.user,
    password: config.clickhouse.password || undefined,
    request_timeout: config.clickhouse.requestTimeoutMs,
    max_open_connections: config.clickhouse.maxOpenConnections,
  });

  return clickhouseClient;
}

export async function isDbHealthy(): Promise<boolean> {
  try {
    const client = getDbClient();
    const result = await client.query({
      query: "SELECT 1",
      format: "JSON",
    });
    await result.json();
    return true;
  } catch {
    return false;
  }
}

export async function closeDb(): Promise<void> {
  if (clickhouseClient) {
    await clickhouseClient.close();
    clickhouseClient = null;
  }
}
