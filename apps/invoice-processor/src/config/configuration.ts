export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'invoice_user',
    password: process.env.DB_PASSWORD || 'invoice_pass',
    database: process.env.DB_DATABASE || 'invoice_processor',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },

  queue: {
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '10', 10),
    maxRetries: parseInt(process.env.QUEUE_MAX_RETRIES || '3', 10),
    retryDelayMs: parseInt(process.env.QUEUE_RETRY_DELAY_MS || '5000', 10),
  },

  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
  },

  extraction: {
    strategy: process.env.EXTRACTION_STRATEGY || 'regex',
  },

  throttle: {
    ttlSeconds: parseInt(process.env.THROTTLE_TTL_SECONDS || '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '200', 10),
  },
});
