export type IngestionMode = "clickhouse" | "kinesis-s3-clickhouse";

function parseIngestionMode(raw: string | undefined): IngestionMode {
  if (raw === "kinesis-s3-clickhouse") return raw;
  return "clickhouse";
}

const ingestionMode = parseIngestionMode(process.env.INGESTION_MODE);

export const config = {
  port: parseInt(process.env.PORT || "3400", 10),

  clickhouse: {
    url: process.env.CLICKHOUSE_URL || "http://localhost:8123",
    database: process.env.CLICKHOUSE_DATABASE || "click_analytics",
    user: process.env.CLICKHOUSE_USER || "default",
    password: process.env.CLICKHOUSE_PASSWORD || "",
    requestTimeoutMs: parseInt(
      process.env.CLICKHOUSE_REQUEST_TIMEOUT_MS || "10000",
      10
    ),
    maxOpenConnections: parseInt(
      process.env.CLICKHOUSE_MAX_OPEN_CONNECTIONS || "20",
      10
    ),
  },

  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
    streamKey: process.env.REDIS_STREAM_KEY || "clicks:stream",
    consumerGroup: process.env.REDIS_CONSUMER_GROUP || "click-workers",
    maxStreamLen: parseInt(process.env.REDIS_MAX_STREAM_LEN || "1000000", 10),
  },

  worker: {
    batchSize: parseInt(process.env.WORKER_BATCH_SIZE || "500", 10),
    batchTimeoutMs: parseInt(process.env.WORKER_BATCH_TIMEOUT_MS || "2000", 10),
    consumerId:
      process.env.WORKER_CONSUMER_ID ||
      `worker-${process.env.HOSTNAME || process.pid}`,
  },

  pipeline: {
    mode: ingestionMode,
    kinesis: {
      region: process.env.AWS_REGION || "us-east-1",
      endpoint: process.env.KINESIS_ENDPOINT || undefined,
      streamName: process.env.KINESIS_STREAM_NAME || "",
      maxRecordsPerRequest: 500,
    },
  },

  buffer: {
    maxSize: parseInt(process.env.BUFFER_MAX_SIZE || "100000", 10),
    flushIntervalMs: parseInt(
      process.env.BUFFER_FLUSH_INTERVAL_MS || "5000",
      10
    ),
  },

  corsOrigins: process.env.CORS_ORIGINS?.split(",") || ["*"],

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || "1000", 10),
  },

  defaultQueryLimit: 20,
  maxQueryLimit: 500,
};
