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

  azure: {
    tenantId: required('AZURE_TENANT_ID'),
    clientId: required('AZURE_CLIENT_ID'),
    clientSecret: required('AZURE_CLIENT_SECRET'),
  },

  hr: {
    email: optional('HR_EMAIL', 'hr@company.com'),
    userId: required('HR_USER_ID'),
  },

  onedrive: {
    rootFolder: optional('ONEDRIVE_ROOT_FOLDER', 'Onboarding Documents'),
  },

  aws: {
    region: optional('AWS_REGION', 'us-east-1'),
    dynamoTable: optional('DYNAMODB_TABLE', 'onboarding-doc-tracker'),
    emailBucket: optional('EMAIL_BUCKET', 'onboarding-doc-emails'),
  },

  ses: {
    fromEmail: optional('SES_FROM_EMAIL', 'onboarding@company.com'),
  },
} as const;
