export const config = {
  port: parseInt(process.env.PORT || "3400", 10),

  database: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    name: process.env.DB_NAME || "click_analytics",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    poolSize: parseInt(process.env.DB_POOL_SIZE || "20", 10),
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
