import { getConfig } from './config';

describe('getConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return default values when no env vars are set', () => {
    delete process.env.NODE_ENV;
    delete process.env.AWS_REGION;
    delete process.env.DYNAMODB_TABLE;
    delete process.env.DYNAMODB_ENDPOINT;
    delete process.env.SQS_QUEUE_URL;
    delete process.env.S3_ENDPOINT;
    delete process.env.S3_REGION;
    delete process.env.S3_ACCESS_KEY;
    delete process.env.S3_SECRET_KEY;
    delete process.env.S3_BUCKET;
    delete process.env.S3_FORCE_PATH_STYLE;
    delete process.env.S3_PRESIGN_EXPIRES;
    delete process.env.SES_REGION;
    delete process.env.SES_FROM_EMAIL;
    delete process.env.EXPORT_MAX_PAGES;
    delete process.env.EXPORT_DEFAULT_PAGE_SIZE;

    const config = getConfig();

    expect(config.nodeEnv).toBe('development');
    expect(config.dynamodb.tableName).toBe('export-jobs');
    expect(config.dynamodb.endpoint).toBeUndefined();
    expect(config.dynamodb.region).toBe('us-east-1');
    expect(config.sqs.queueUrl).toBe('');
    expect(config.sqs.region).toBe('us-east-1');
    expect(config.s3.endpoint).toBeUndefined();
    expect(config.s3.region).toBe('us-east-1');
    expect(config.s3.accessKey).toBe('');
    expect(config.s3.secretKey).toBe('');
    expect(config.s3.bucket).toBe('data-exports');
    expect(config.s3.forcePathStyle).toBe(true);
    expect(config.s3.presignExpiresSeconds).toBe(604800);
    expect(config.ses.region).toBe('us-east-1');
    expect(config.ses.fromEmail).toBe('exports@example.com');
    expect(config.export.maxPages).toBe(10000);
    expect(config.export.defaultPageSize).toBe(500);
  });

  it('should use env var values when they are set', () => {
    process.env.NODE_ENV = 'production';
    process.env.AWS_REGION = 'eu-west-1';
    process.env.DYNAMODB_TABLE = 'prod-export-jobs';
    process.env.DYNAMODB_ENDPOINT = 'http://localhost:8000';
    process.env.SQS_QUEUE_URL = 'https://sqs.eu-west-1.amazonaws.com/123/q';
    process.env.S3_ENDPOINT = 'https://s3.amazonaws.com';
    process.env.S3_REGION = 'eu-west-1';
    process.env.S3_ACCESS_KEY = 'AKIAIOSFODNN7EXAMPLE';
    process.env.S3_SECRET_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
    process.env.S3_BUCKET = 'prod-exports';
    process.env.S3_FORCE_PATH_STYLE = 'false';
    process.env.S3_PRESIGN_EXPIRES = '3600';
    process.env.SES_REGION = 'eu-west-1';
    process.env.SES_FROM_EMAIL = 'noreply@prod.com';
    process.env.EXPORT_MAX_PAGES = '5000';
    process.env.EXPORT_DEFAULT_PAGE_SIZE = '1000';

    const config = getConfig();

    expect(config.nodeEnv).toBe('production');
    expect(config.dynamodb.tableName).toBe('prod-export-jobs');
    expect(config.dynamodb.endpoint).toBe('http://localhost:8000');
    expect(config.dynamodb.region).toBe('eu-west-1');
    expect(config.sqs.queueUrl).toBe(
      'https://sqs.eu-west-1.amazonaws.com/123/q',
    );
    expect(config.s3.endpoint).toBe('https://s3.amazonaws.com');
    expect(config.s3.region).toBe('eu-west-1');
    expect(config.s3.accessKey).toBe('AKIAIOSFODNN7EXAMPLE');
    expect(config.s3.secretKey).toBe(
      'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    );
    expect(config.s3.bucket).toBe('prod-exports');
    expect(config.s3.forcePathStyle).toBe(false);
    expect(config.s3.presignExpiresSeconds).toBe(3600);
    expect(config.ses.region).toBe('eu-west-1');
    expect(config.ses.fromEmail).toBe('noreply@prod.com');
    expect(config.export.maxPages).toBe(5000);
    expect(config.export.defaultPageSize).toBe(1000);
  });

  it('should set forcePathStyle to true when S3_FORCE_PATH_STYLE is not "false"', () => {
    process.env.S3_FORCE_PATH_STYLE = 'true';
    expect(getConfig().s3.forcePathStyle).toBe(true);

    process.env.S3_FORCE_PATH_STYLE = 'anything';
    expect(getConfig().s3.forcePathStyle).toBe(true);
  });
});
