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

export const config = {
  port: parseInt(optional('PORT', '3005'), 10),
  nodeEnv: optional('NODE_ENV', 'development'),

  aws: {
    region: optional('AWS_REGION', 'us-east-1'),
    dynamoTable: optional('DYNAMODB_TABLE', 'onboarding-doc-tracker'),
    tenantsTable: optional('TENANTS_TABLE', 'onboarding-doc-tenants'),
    emailBucket: optional('EMAIL_BUCKET', 'onboarding-doc-emails'),
  },

  apiKey: process.env.NODE_ENV === 'production' ? required('API_KEY') : optional('API_KEY', ''),

  processing: {
    emailConcurrency: parseInt(optional('EMAIL_CONCURRENCY', '5'), 10),
    uploadConcurrency: parseInt(optional('UPLOAD_CONCURRENCY', '3'), 10),
    retryMaxAttempts: parseInt(optional('RETRY_MAX_ATTEMPTS', '3'), 10),
    retryBaseDelayMs: parseInt(optional('RETRY_BASE_DELAY_MS', '500'), 10),
    retryMaxDelayMs: parseInt(optional('RETRY_MAX_DELAY_MS', '15000'), 10),
  },
} as const;
