import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { ExportsController } from '../src/exports/exports.controller';
import { ExportsService, EXPORT_QUEUE_NAME } from '../src/exports/exports.service';
import { ExportJob } from '../src/exports/entities/export-job.entity';
import { ExportStatus, PaginationStrategy } from '../src/exports/enums';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

describe('Exports (e2e)', () => {
  let app: INestApplication;
  let mockRepository: Record<string, jest.Mock>;
  let mockQueue: Record<string, jest.Mock>;

  const mockDate = new Date('2026-01-15T10:00:00Z');

  const TEST_UUID = '550e8400-e29b-41d4-a716-446655440000';

  const createMockJob = (overrides: Partial<ExportJob> = {}): ExportJob => ({
    id: TEST_UUID,
    status: ExportStatus.PENDING,
    apiUrl: 'https://api.example.com/data',
    email: 'user@example.com',
    paginationStrategy: PaginationStrategy.PAGE,
    headers: null,
    queryParams: null,
    pageSize: 500,
    dataPath: 'data',
    cursorPath: null,
    cursorParam: null,
    fileName: null,
    s3Key: null,
    downloadUrl: null,
    totalRecords: 0,
    pagesProcessed: 0,
    errorMessage: null,
    attempts: 0,
    startedAt: null,
    completedAt: null,
    createdAt: mockDate,
    updatedAt: mockDate,
    ...overrides,
  });

  beforeAll(async () => {
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'bull-1' }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ export: { defaultPageSize: 500 } })],
        }),
      ],
      controllers: [ExportsController],
      providers: [
        ExportsService,
        {
          provide: getRepositoryToken(ExportJob),
          useValue: mockRepository,
        },
        {
          provide: getQueueToken(EXPORT_QUEUE_NAME),
          useValue: mockQueue,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/exports', () => {
    it('should accept a valid export request and return 202', async () => {
      const savedJob = createMockJob();
      mockRepository.create.mockReturnValue(savedJob);
      mockRepository.save.mockResolvedValue(savedJob);

      const response = await request(app.getHttpServer())
        .post('/api/v1/exports')
        .send({
          apiUrl: 'https://api.example.com/data',
          email: 'user@example.com',
        })
        .expect(202);

      expect(response.body).toEqual(expect.objectContaining({
        id: TEST_UUID,
        status: ExportStatus.PENDING,
        totalRecords: 0,
        pagesProcessed: 0,
      }));

      expect(mockQueue.add).toHaveBeenCalledWith(
        'process-export',
        { exportJobId: TEST_UUID },
        expect.any(Object),
      );
    });

    it('should accept request with all optional fields', async () => {
      const savedJob = createMockJob({
        paginationStrategy: PaginationStrategy.CURSOR,
        headers: { Authorization: 'Bearer token' },
        queryParams: { status: 'active' },
        pageSize: 100,
        dataPath: 'results',
        cursorPath: 'meta.next',
        cursorParam: 'after',
        fileName: 'my-export',
      });
      mockRepository.create.mockReturnValue(savedJob);
      mockRepository.save.mockResolvedValue(savedJob);

      await request(app.getHttpServer())
        .post('/api/v1/exports')
        .send({
          apiUrl: 'https://api.example.com/orders',
          email: 'admin@example.com',
          paginationStrategy: 'cursor',
          headers: { Authorization: 'Bearer token' },
          queryParams: { status: 'active' },
          pageSize: 100,
          dataPath: 'results',
          cursorPath: 'meta.next',
          cursorParam: 'after',
          fileName: 'my-export',
        })
        .expect(202);

      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('should return 400 for missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/exports')
        .send({})
        .expect(400);
    });

    it('should return 400 for invalid email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/exports')
        .send({
          apiUrl: 'https://api.example.com/data',
          email: 'not-an-email',
        })
        .expect(400);
    });

    it('should return 400 for invalid URL', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/exports')
        .send({
          apiUrl: '://missing-protocol',
          email: 'user@example.com',
        })
        .expect(400);
    });

    it('should return 400 for pageSize out of range', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/exports')
        .send({
          apiUrl: 'https://api.example.com/data',
          email: 'user@example.com',
          pageSize: 10000,
        })
        .expect(400);
    });

    it('should return 400 for invalid pagination strategy', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/exports')
        .send({
          apiUrl: 'https://api.example.com/data',
          email: 'user@example.com',
          paginationStrategy: 'invalid',
        })
        .expect(400);
    });

    it('should return 400 for non-whitelisted fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/exports')
        .send({
          apiUrl: 'https://api.example.com/data',
          email: 'user@example.com',
          unknownField: 'should be rejected',
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/exports/:id', () => {
    it('should return 200 with job status for existing job', async () => {
      const job = createMockJob({
        status: ExportStatus.COMPLETED,
        totalRecords: 1500,
        pagesProcessed: 3,
        downloadUrl: 'https://s3.example.com/download',
        completedAt: new Date('2026-01-15T10:05:00Z'),
      });
      mockRepository.findOne.mockResolvedValue(job);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/exports/${TEST_UUID}`)
        .expect(200);

      expect(response.body).toEqual(expect.objectContaining({
        id: TEST_UUID,
        status: ExportStatus.COMPLETED,
        totalRecords: 1500,
        downloadUrl: 'https://s3.example.com/download',
      }));
    });

    it('should return 404 for non-existent job', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/api/v1/exports/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/exports/not-a-uuid')
        .expect(400);
    });

    it('should return failed job status with error message', async () => {
      const job = createMockJob({
        status: ExportStatus.FAILED,
        errorMessage: 'API returned 500',
      });
      mockRepository.findOne.mockResolvedValue(job);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/exports/${TEST_UUID}`)
        .expect(200);

      expect(response.body.status).toBe(ExportStatus.FAILED);
      expect(response.body.errorMessage).toBe('API returned 500');
    });

    it('should return processing job status', async () => {
      const job = createMockJob({
        status: ExportStatus.PROCESSING,
        totalRecords: 500,
        pagesProcessed: 1,
        startedAt: new Date('2026-01-15T10:01:00Z'),
      });
      mockRepository.findOne.mockResolvedValue(job);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/exports/${TEST_UUID}`)
        .expect(200);

      expect(response.body.status).toBe(ExportStatus.PROCESSING);
      expect(response.body.totalRecords).toBe(500);
    });
  });
});
