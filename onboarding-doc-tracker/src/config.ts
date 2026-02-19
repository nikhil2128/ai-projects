function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

const isProd = process.env.NODE_ENV === 'production';

export const config = {
  port: parseInt(optional('PORT', '3005'), 10),
  nodeEnv: optional('NODE_ENV', 'development'),

  aws: {
    region: optional('AWS_REGION', 'us-east-1'),
    dynamoTable: optional('DYNAMODB_TABLE', 'onboarding-doc-tracker'),
    tenantsTable: optional('TENANTS_TABLE', 'onboarding-doc-tenants'),
    emailBucket: optional('EMAIL_BUCKET', 'onboarding-doc-emails'),
    kmsKeyArn: isProd ? required('KMS_KEY_ARN') : optional('KMS_KEY_ARN', ''),
    secretsPrefix: optional('SECRETS_PREFIX', 'onboarding-doc-tracker/tenants'),
  },

  apiKey: isProd ? required('API_KEY') : optional('API_KEY', ''),

  security: {
    rateLimitWindowMs: parseInt(optional('RATE_LIMIT_WINDOW_MS', '60000'), 10),
    rateLimitMaxRequests: parseInt(optional('RATE_LIMIT_MAX_REQUESTS', '60'), 10),
    corsAllowedOrigins: optional('CORS_ALLOWED_ORIGINS', '*').split(',').map((o) => o.trim()),
    maxRequestBodyBytes: parseInt(optional('MAX_REQUEST_BODY_BYTES', '1048576'), 10), // 1MB
    secretsCacheTtlMs: parseInt(optional('SECRETS_CACHE_TTL_MS', '300000'), 10), // 5 min
  },

  processing: {
    emailConcurrency: parseInt(optional('EMAIL_CONCURRENCY', '5'), 10),
    uploadConcurrency: parseInt(optional('UPLOAD_CONCURRENCY', '3'), 10),
    retryMaxAttempts: parseInt(optional('RETRY_MAX_ATTEMPTS', '3'), 10),
    retryBaseDelayMs: parseInt(optional('RETRY_BASE_DELAY_MS', '500'), 10),
    retryMaxDelayMs: parseInt(optional('RETRY_MAX_DELAY_MS', '15000'), 10),
  },
} as const;
