import configuration from './configuration';

describe('configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return default values when no env vars are set', () => {
    delete process.env.PORT;
    delete process.env.NODE_ENV;
    delete process.env.DB_HOST;
    delete process.env.DB_PORT;
    delete process.env.DB_USERNAME;
    delete process.env.DB_PASSWORD;
    delete process.env.DB_DATABASE;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
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
    delete process.env.EXPORT_QUEUE_CONCURRENCY;
    delete process.env.THROTTLE_TTL_SECONDS;
    delete process.env.THROTTLE_LIMIT;

    const config = configuration();

    expect(config.port).toBe(3000);
    expect(config.nodeEnv).toBe('development');
    expect(config.database.host).toBe('localhost');
    expect(config.database.port).toBe(5432);
    expect(config.database.username).toBe('export_user');
    expect(config.database.password).toBe('export_pass');
    expect(config.database.database).toBe('data_export_service');
    expect(config.redis.host).toBe('localhost');
    expect(config.redis.port).toBe(6379);
    expect(config.s3.endpoint).toBe('http://localhost:9000');
    expect(config.s3.region).toBe('us-east-1');
    expect(config.s3.accessKey).toBe('minioadmin');
    expect(config.s3.secretKey).toBe('minioadmin123');
    expect(config.s3.bucket).toBe('data-exports');
    expect(config.s3.forcePathStyle).toBe(true);
    expect(config.s3.presignExpiresSeconds).toBe(604800);
    expect(config.ses.region).toBe('us-east-1');
    expect(config.ses.fromEmail).toBe('exports@example.com');
    expect(config.export.maxPages).toBe(10000);
    expect(config.export.defaultPageSize).toBe(500);
    expect(config.export.queueConcurrency).toBe(5);
    expect(config.throttle.ttlSeconds).toBe(60);
    expect(config.throttle.limit).toBe(30);
  });

  it('should use env var values when they are set', () => {
    process.env.PORT = '8080';
    process.env.NODE_ENV = 'production';
    process.env.DB_HOST = 'db.prod.com';
    process.env.DB_PORT = '5433';
    process.env.DB_USERNAME = 'prod_user';
    process.env.DB_PASSWORD = 'prod_pass';
    process.env.DB_DATABASE = 'prod_db';
    process.env.REDIS_HOST = 'redis.prod.com';
    process.env.REDIS_PORT = '6380';
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
    process.env.EXPORT_QUEUE_CONCURRENCY = '10';
    process.env.THROTTLE_TTL_SECONDS = '120';
    process.env.THROTTLE_LIMIT = '50';

    const config = configuration();

    expect(config.port).toBe(8080);
    expect(config.nodeEnv).toBe('production');
    expect(config.database.host).toBe('db.prod.com');
    expect(config.database.port).toBe(5433);
    expect(config.database.username).toBe('prod_user');
    expect(config.database.password).toBe('prod_pass');
    expect(config.database.database).toBe('prod_db');
    expect(config.redis.host).toBe('redis.prod.com');
    expect(config.redis.port).toBe(6380);
    expect(config.s3.endpoint).toBe('https://s3.amazonaws.com');
    expect(config.s3.region).toBe('eu-west-1');
    expect(config.s3.accessKey).toBe('AKIAIOSFODNN7EXAMPLE');
    expect(config.s3.secretKey).toBe('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
    expect(config.s3.bucket).toBe('prod-exports');
    expect(config.s3.forcePathStyle).toBe(false);
    expect(config.s3.presignExpiresSeconds).toBe(3600);
    expect(config.ses.region).toBe('eu-west-1');
    expect(config.ses.fromEmail).toBe('noreply@prod.com');
    expect(config.export.maxPages).toBe(5000);
    expect(config.export.defaultPageSize).toBe(1000);
    expect(config.export.queueConcurrency).toBe(10);
    expect(config.throttle.ttlSeconds).toBe(120);
    expect(config.throttle.limit).toBe(50);
  });

  it('should set forcePathStyle to true when S3_FORCE_PATH_STYLE is not "false"', () => {
    process.env.S3_FORCE_PATH_STYLE = 'true';
    expect(configuration().s3.forcePathStyle).toBe(true);

    process.env.S3_FORCE_PATH_STYLE = 'anything';
    expect(configuration().s3.forcePathStyle).toBe(true);
  });
});
