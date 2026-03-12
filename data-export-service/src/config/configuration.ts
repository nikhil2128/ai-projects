export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'export_user',
    password: process.env.DB_PASSWORD || 'export_pass',
    database: process.env.DB_DATABASE || 'data_export_service',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },

  s3: {
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    region: process.env.S3_REGION || 'us-east-1',
    accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.S3_SECRET_KEY || 'minioadmin123',
    bucket: process.env.S3_BUCKET || 'data-exports',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
    presignExpiresSeconds: parseInt(process.env.S3_PRESIGN_EXPIRES || '604800', 10),
  },

  ses: {
    region: process.env.SES_REGION || 'us-east-1',
    fromEmail: process.env.SES_FROM_EMAIL || 'exports@example.com',
  },

  export: {
    maxPages: parseInt(process.env.EXPORT_MAX_PAGES || '10000', 10),
    defaultPageSize: parseInt(process.env.EXPORT_DEFAULT_PAGE_SIZE || '500', 10),
    queueConcurrency: parseInt(process.env.EXPORT_QUEUE_CONCURRENCY || '5', 10),
  },

  throttle: {
    ttlSeconds: parseInt(process.env.THROTTLE_TTL_SECONDS || '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '30', 10),
  },
});
