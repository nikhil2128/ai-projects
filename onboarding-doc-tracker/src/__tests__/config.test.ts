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

  it('loads all config values with defaults', async () => {
    delete process.env.PORT;
    delete process.env.NODE_ENV;
    delete process.env.AWS_REGION;
    delete process.env.DYNAMODB_TABLE;
    delete process.env.TENANTS_TABLE;
    delete process.env.EMAIL_BUCKET;
    delete process.env.API_KEY;

    const { config } = await import('../config');

    expect(config.port).toBe(3005);
    expect(config.nodeEnv).toBe('development');
    expect(config.aws.region).toBe('us-east-1');
    expect(config.aws.dynamoTable).toBe('onboarding-doc-tracker');
    expect(config.aws.tenantsTable).toBe('onboarding-doc-tenants');
    expect(config.aws.emailBucket).toBe('onboarding-doc-emails');
    expect(config.apiKey).toBe('');
  });

  it('uses custom values when set', async () => {
    process.env.PORT = '4000';
    process.env.NODE_ENV = 'staging';
    process.env.AWS_REGION = 'eu-west-1';
    process.env.DYNAMODB_TABLE = 'custom-table';
    process.env.TENANTS_TABLE = 'custom-tenants';
    process.env.EMAIL_BUCKET = 'custom-bucket';
    process.env.API_KEY = 'my-secret-key';

    const { config } = await import('../config');

    expect(config.port).toBe(4000);
    expect(config.nodeEnv).toBe('staging');
    expect(config.aws.region).toBe('eu-west-1');
    expect(config.aws.dynamoTable).toBe('custom-table');
    expect(config.aws.tenantsTable).toBe('custom-tenants');
    expect(config.aws.emailBucket).toBe('custom-bucket');
    expect(config.apiKey).toBe('my-secret-key');
  });

  it('requires API_KEY in production', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.API_KEY;

    await expect(import('../config')).rejects.toThrow(
      'Missing required environment variable: API_KEY'
    );
  });

  it('parses PORT as integer', async () => {
    process.env.PORT = '8080';

    const { config } = await import('../config');
    expect(config.port).toBe(8080);
    expect(typeof config.port).toBe('number');
  });

  it('loads processing config with defaults', async () => {
    const { config } = await import('../config');

    expect(config.processing.emailConcurrency).toBe(5);
    expect(config.processing.uploadConcurrency).toBe(3);
    expect(config.processing.retryMaxAttempts).toBe(3);
    expect(config.processing.retryBaseDelayMs).toBe(500);
    expect(config.processing.retryMaxDelayMs).toBe(15000);
  });
});
