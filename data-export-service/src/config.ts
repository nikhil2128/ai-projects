export function getConfig() {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',

    dynamodb: {
      tableName: process.env.DYNAMODB_TABLE || 'export-jobs',
      endpoint: process.env.DYNAMODB_ENDPOINT || undefined,
      region: process.env.AWS_REGION || 'us-east-1',
    },

    sqs: {
      queueUrl: process.env.SQS_QUEUE_URL || '',
      region: process.env.AWS_REGION || 'us-east-1',
    },

    s3: {
      endpoint: process.env.S3_ENDPOINT || undefined,
      region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1',
      accessKey: process.env.S3_ACCESS_KEY || '',
      secretKey: process.env.S3_SECRET_KEY || '',
      bucket: process.env.S3_BUCKET || 'data-exports',
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
      presignExpiresSeconds: parseInt(
        process.env.S3_PRESIGN_EXPIRES || '604800',
        10,
      ),
    },

    ses: {
      region: process.env.SES_REGION || process.env.AWS_REGION || 'us-east-1',
      fromEmail: process.env.SES_FROM_EMAIL || 'exports@example.com',
    },

    export: {
      maxPages: parseInt(process.env.EXPORT_MAX_PAGES || '10000', 10),
      defaultPageSize: parseInt(
        process.env.EXPORT_DEFAULT_PAGE_SIZE || '500',
        10,
      ),
    },
  };
}
