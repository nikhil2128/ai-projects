import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('config', () => {
  const savedEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...savedEnv };
  });

  afterEach(() => {
    process.env = savedEnv;
  });

  function setRequiredEnvVars() {
    process.env.AZURE_TENANT_ID = 'test-tenant';
    process.env.AZURE_CLIENT_ID = 'test-client';
    process.env.AZURE_CLIENT_SECRET = 'test-secret';
    process.env.HR_USER_ID = 'test-hr-user';
  }

  it('loads all config values with required env vars set', async () => {
    setRequiredEnvVars();
    const { config } = await import('../config');

    expect(config.azure.tenantId).toBe('test-tenant');
    expect(config.azure.clientId).toBe('test-client');
    expect(config.azure.clientSecret).toBe('test-secret');
    expect(config.hr.userId).toBe('test-hr-user');
  });

  it('uses default values for optional vars', async () => {
    setRequiredEnvVars();
    delete process.env.PORT;
    delete process.env.NODE_ENV;
    delete process.env.HR_EMAIL;
    delete process.env.ONEDRIVE_ROOT_FOLDER;
    delete process.env.AWS_REGION;
    delete process.env.DYNAMODB_TABLE;
    delete process.env.EMAIL_BUCKET;
    delete process.env.SES_FROM_EMAIL;

    const { config } = await import('../config');

    expect(config.port).toBe(3005);
    expect(config.nodeEnv).toBe('development');
    expect(config.hr.email).toBe('hr@company.com');
    expect(config.onedrive.rootFolder).toBe('Onboarding Documents');
    expect(config.aws.region).toBe('us-east-1');
    expect(config.aws.dynamoTable).toBe('onboarding-doc-tracker');
    expect(config.aws.emailBucket).toBe('onboarding-doc-emails');
    expect(config.ses.fromEmail).toBe('onboarding@company.com');
  });

  it('uses custom values for optional vars when set', async () => {
    setRequiredEnvVars();
    process.env.PORT = '4000';
    process.env.NODE_ENV = 'production';
    process.env.HR_EMAIL = 'custom-hr@test.com';
    process.env.ONEDRIVE_ROOT_FOLDER = 'Custom Folder';
    process.env.AWS_REGION = 'eu-west-1';
    process.env.DYNAMODB_TABLE = 'custom-table';
    process.env.EMAIL_BUCKET = 'custom-bucket';
    process.env.SES_FROM_EMAIL = 'custom@test.com';

    const { config } = await import('../config');

    expect(config.port).toBe(4000);
    expect(config.nodeEnv).toBe('production');
    expect(config.hr.email).toBe('custom-hr@test.com');
    expect(config.onedrive.rootFolder).toBe('Custom Folder');
    expect(config.aws.region).toBe('eu-west-1');
    expect(config.aws.dynamoTable).toBe('custom-table');
    expect(config.aws.emailBucket).toBe('custom-bucket');
    expect(config.ses.fromEmail).toBe('custom@test.com');
  });

  it('throws when AZURE_TENANT_ID is missing', async () => {
    setRequiredEnvVars();
    delete process.env.AZURE_TENANT_ID;

    await expect(import('../config')).rejects.toThrow(
      'Missing required environment variable: AZURE_TENANT_ID'
    );
  });

  it('throws when AZURE_CLIENT_ID is missing', async () => {
    setRequiredEnvVars();
    delete process.env.AZURE_CLIENT_ID;

    await expect(import('../config')).rejects.toThrow(
      'Missing required environment variable: AZURE_CLIENT_ID'
    );
  });

  it('throws when AZURE_CLIENT_SECRET is missing', async () => {
    setRequiredEnvVars();
    delete process.env.AZURE_CLIENT_SECRET;

    await expect(import('../config')).rejects.toThrow(
      'Missing required environment variable: AZURE_CLIENT_SECRET'
    );
  });

  it('throws when HR_USER_ID is missing', async () => {
    setRequiredEnvVars();
    delete process.env.HR_USER_ID;

    await expect(import('../config')).rejects.toThrow(
      'Missing required environment variable: HR_USER_ID'
    );
  });

  it('parses PORT as integer', async () => {
    setRequiredEnvVars();
    process.env.PORT = '8080';

    const { config } = await import('../config');
    expect(config.port).toBe(8080);
    expect(typeof config.port).toBe('number');
  });
});
