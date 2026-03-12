import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Queue } from 'bullmq';
import { ExportsService, EXPORT_QUEUE_NAME } from './exports.service';
import { ExportJob } from './entities/export-job.entity';
import { CreateExportDto } from './dto';
import { ExportStatus, PaginationStrategy } from './enums';

describe('ExportsService', () => {
  let service: ExportsService;
  let repository: jest.Mocked<Repository<ExportJob>>;
  let queue: jest.Mocked<Queue>;
  let configService: ConfigService;

  const mockDate = new Date('2026-01-15T10:00:00Z');

  const createMockJob = (overrides: Partial<ExportJob> = {}): ExportJob => ({
    id: 'test-uuid-1',
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportsService,
        {
          provide: getRepositoryToken(ExportJob),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getQueueToken(EXPORT_QUEUE_NAME),
          useValue: {
            add: jest.fn().mockResolvedValue({ id: 'bull-job-1' }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              const config: Record<string, unknown> = {
                'export.defaultPageSize': 500,
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ExportsService>(ExportsService);
    repository = module.get(getRepositoryToken(ExportJob));
    queue = module.get(getQueueToken(EXPORT_QUEUE_NAME));
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should export EXPORT_QUEUE_NAME constant', () => {
    expect(EXPORT_QUEUE_NAME).toBe('data-export');
  });

  describe('createExport', () => {
    it('should create an export job with defaults', async () => {
      const dto: CreateExportDto = {
        apiUrl: 'https://api.example.com/users',
        email: 'user@example.com',
      };

      const createdJob = createMockJob({
        apiUrl: dto.apiUrl,
        email: dto.email,
      });

      repository.create.mockReturnValue(createdJob);
      repository.save.mockResolvedValue(createdJob);

      const result = await service.createExport(dto);

      expect(repository.create).toHaveBeenCalledWith({
        apiUrl: dto.apiUrl,
        email: dto.email,
        paginationStrategy: PaginationStrategy.PAGE,
        headers: null,
        queryParams: null,
        pageSize: 500,
        dataPath: 'data',
        cursorPath: null,
        cursorParam: null,
        fileName: null,
        status: ExportStatus.PENDING,
      });
      expect(repository.save).toHaveBeenCalledWith(createdJob);
      expect(queue.add).toHaveBeenCalledWith(
        'process-export',
        { exportJobId: createdJob.id },
        expect.objectContaining({
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }),
      );
      expect(result.id).toBe(createdJob.id);
      expect(result.status).toBe(ExportStatus.PENDING);
    });

    it('should create an export job with all custom values', async () => {
      const dto: CreateExportDto = {
        apiUrl: 'https://api.example.com/orders',
        email: 'admin@example.com',
        paginationStrategy: PaginationStrategy.CURSOR,
        headers: { Authorization: 'Bearer token123' },
        queryParams: { status: 'active' },
        pageSize: 100,
        dataPath: 'results.items',
        cursorPath: 'meta.next',
        cursorParam: 'after',
        fileName: 'orders-report',
      };

      const createdJob = createMockJob({
        apiUrl: dto.apiUrl,
        email: dto.email,
        paginationStrategy: PaginationStrategy.CURSOR,
        headers: dto.headers!,
        queryParams: dto.queryParams!,
        pageSize: 100,
        dataPath: 'results.items',
        cursorPath: 'meta.next',
        cursorParam: 'after',
        fileName: 'orders-report',
      });

      repository.create.mockReturnValue(createdJob);
      repository.save.mockResolvedValue(createdJob);

      const result = await service.createExport(dto);

      expect(repository.create).toHaveBeenCalledWith({
        apiUrl: dto.apiUrl,
        email: dto.email,
        paginationStrategy: PaginationStrategy.CURSOR,
        headers: dto.headers,
        queryParams: dto.queryParams,
        pageSize: 100,
        dataPath: 'results.items',
        cursorPath: 'meta.next',
        cursorParam: 'after',
        fileName: 'orders-report',
        status: ExportStatus.PENDING,
      });
      expect(result.id).toBe(createdJob.id);
    });

    it('should return a properly shaped response DTO', async () => {
      const dto: CreateExportDto = {
        apiUrl: 'https://api.example.com/data',
        email: 'user@example.com',
      };

      const savedJob = createMockJob({
        downloadUrl: null,
        errorMessage: null,
        startedAt: null,
        completedAt: null,
      });

      repository.create.mockReturnValue(savedJob);
      repository.save.mockResolvedValue(savedJob);

      const result = await service.createExport(dto);

      expect(result).toEqual({
        id: savedJob.id,
        status: savedJob.status,
        totalRecords: 0,
        pagesProcessed: 0,
        downloadUrl: null,
        errorMessage: null,
        createdAt: mockDate,
        startedAt: null,
        completedAt: null,
      });
    });
  });

  describe('getExportStatus', () => {
    it('should return status for an existing job', async () => {
      const job = createMockJob({
        status: ExportStatus.COMPLETED,
        totalRecords: 1500,
        pagesProcessed: 3,
        downloadUrl: 'https://s3.example.com/download',
        completedAt: new Date('2026-01-15T10:05:00Z'),
      });
      repository.findOne.mockResolvedValue(job);

      const result = await service.getExportStatus('test-uuid-1');

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'test-uuid-1' } });
      expect(result.status).toBe(ExportStatus.COMPLETED);
      expect(result.totalRecords).toBe(1500);
      expect(result.downloadUrl).toBe('https://s3.example.com/download');
    });

    it('should throw NotFoundException for non-existent job', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.getExportStatus('non-existent-id'))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('findById', () => {
    it('should return the job when found', async () => {
      const job = createMockJob();
      repository.findOne.mockResolvedValue(job);

      const result = await service.findById('test-uuid-1');

      expect(result).toEqual(job);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'test-uuid-1' } });
    });

    it('should return null when not found', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.findById('missing-id');

      expect(result).toBeNull();
    });
  });

  describe('updateJob', () => {
    it('should update the job with provided fields', async () => {
      repository.update.mockResolvedValue({ affected: 1 } as any);

      await service.updateJob('test-uuid-1', {
        status: ExportStatus.PROCESSING,
        startedAt: mockDate,
      });

      expect(repository.update).toHaveBeenCalledWith('test-uuid-1', {
        status: ExportStatus.PROCESSING,
        startedAt: mockDate,
      });
    });
  });
});
