import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import * as fs from 'fs';
import { Readable } from 'stream';
import { ExportsProcessor } from './exports.processor';
import { ExportsService } from './exports.service';
import { S3Service } from '../s3/s3.service';
import { EmailService } from '../email/email.service';
import { ExportJob } from './entities/export-job.entity';
import { ExportStatus, PaginationStrategy } from './enums';

jest.mock('uuid', () => ({ v4: () => 'mock-uuid-1234' }));

describe('ExportsProcessor', () => {
  let processor: ExportsProcessor;
  let exportsService: jest.Mocked<ExportsService>;
  let s3Service: jest.Mocked<S3Service>;
  let emailService: jest.Mocked<EmailService>;
  let originalFetch: typeof global.fetch;

  const mockDate = new Date('2026-01-15T10:00:00Z');

  const createMockExportJob = (overrides: Partial<ExportJob> = {}): ExportJob => ({
    id: 'job-1',
    status: ExportStatus.PENDING,
    apiUrl: 'https://api.example.com/data',
    email: 'user@example.com',
    paginationStrategy: PaginationStrategy.PAGE,
    headers: null,
    queryParams: null,
    pageSize: 10,
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

  const createMockBullJob = (overrides: Partial<Job> = {}): Job => ({
    data: { exportJobId: 'job-1' },
    attemptsMade: 0,
    opts: { attempts: 3 },
    updateProgress: jest.fn(),
    ...overrides,
  } as unknown as Job);

  beforeEach(async () => {
    originalFetch = global.fetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportsProcessor,
        {
          provide: ExportsService,
          useValue: {
            findById: jest.fn(),
            updateJob: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: S3Service,
          useValue: {
            uploadStream: jest.fn().mockResolvedValue('exports/job-1/export-job-1.csv'),
            getPresignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/presigned'),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendExportReadyEmail: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              const config: Record<string, unknown> = {
                'export.maxPages': 100,
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    processor = module.get<ExportsProcessor>(ExportsProcessor);
    exportsService = module.get(ExportsService);
    s3Service = module.get(S3Service);
    emailService = module.get(EmailService);

    jest.spyOn(fs, 'createReadStream').mockReturnValue(
      Readable.from(['mock-csv-data']) as any,
    );
    jest.spyOn(fs.promises, 'unlink').mockResolvedValue();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('process', () => {
    it('should skip processing when job is not found', async () => {
      exportsService.findById.mockResolvedValue(null);
      const bullJob = createMockBullJob();

      await processor.process(bullJob);

      expect(exportsService.findById).toHaveBeenCalledWith('job-1');
      expect(exportsService.updateJob).not.toHaveBeenCalled();
    });

    it('should process a single page export successfully', async () => {
      const exportJob = createMockExportJob();
      exportsService.findById.mockResolvedValue(exportJob);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' },
          ],
        }),
      });

      const bullJob = createMockBullJob();
      await processor.process(bullJob);

      expect(exportsService.updateJob).toHaveBeenCalledWith('job-1', expect.objectContaining({
        status: ExportStatus.PROCESSING,
      }));

      expect(exportsService.updateJob).toHaveBeenCalledWith('job-1', expect.objectContaining({
        status: ExportStatus.COMPLETED,
        totalRecords: 2,
        pagesProcessed: 1,
      }));

      expect(s3Service.uploadStream).toHaveBeenCalledWith(
        'exports/job-1/export-job-1.csv',
        expect.anything(),
      );
      expect(s3Service.getPresignedUrl).toHaveBeenCalledWith('exports/job-1/export-job-1.csv');
      expect(emailService.sendExportReadyEmail).toHaveBeenCalledWith(
        'user@example.com',
        'https://s3.example.com/presigned',
        'export-job-1.csv',
        2,
      );
    });

    it('should use custom fileName when provided', async () => {
      const exportJob = createMockExportJob({ fileName: 'my-report' });
      exportsService.findById.mockResolvedValue(exportJob);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ id: 1 }] }),
      });

      await processor.process(createMockBullJob());

      expect(s3Service.uploadStream).toHaveBeenCalledWith(
        'exports/job-1/my-report.csv',
        expect.anything(),
      );
      expect(emailService.sendExportReadyEmail).toHaveBeenCalledWith(
        'user@example.com',
        expect.any(String),
        'my-report.csv',
        1,
      );
    });

    it('should handle multiple pages of data', async () => {
      const exportJob = createMockExportJob({ pageSize: 2 });
      exportsService.findById.mockResolvedValue(exportJob);

      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: true,
            json: async () => ({ data: [{ id: 1 }, { id: 2 }] }),
          };
        }
        return {
          ok: true,
          json: async () => ({ data: [{ id: 3 }] }),
        };
      });

      await processor.process(createMockBullJob());

      expect(exportsService.updateJob).toHaveBeenCalledWith('job-1', expect.objectContaining({
        status: ExportStatus.COMPLETED,
        totalRecords: 3,
        pagesProcessed: 2,
      }));
    });

    it('should stop when API returns empty data', async () => {
      const exportJob = createMockExportJob();
      exportsService.findById.mockResolvedValue(exportJob);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await processor.process(createMockBullJob());

      expect(exportsService.updateJob).toHaveBeenCalledWith('job-1', expect.objectContaining({
        status: ExportStatus.COMPLETED,
        totalRecords: 0,
        pagesProcessed: 0,
      }));
    });

    it('should stop when API returns null data', async () => {
      const exportJob = createMockExportJob();
      exportsService.findById.mockResolvedValue(exportJob);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: null }),
      });

      await processor.process(createMockBullJob());

      expect(exportsService.updateJob).toHaveBeenCalledWith('job-1', expect.objectContaining({
        status: ExportStatus.COMPLETED,
        totalRecords: 0,
      }));
    });

    it('should mark job as FAILED on last attempt', async () => {
      const exportJob = createMockExportJob();
      exportsService.findById.mockResolvedValue(exportJob);

      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const bullJob = createMockBullJob({
        attemptsMade: 2,
        opts: { attempts: 3 },
      } as any);

      await expect(processor.process(bullJob)).rejects.toThrow('Network error');

      expect(exportsService.updateJob).toHaveBeenCalledWith('job-1', expect.objectContaining({
        status: ExportStatus.FAILED,
        errorMessage: expect.stringContaining('Failed after 3 attempts'),
      }));
    });

    it('should not mark as FAILED if not the last attempt', async () => {
      const exportJob = createMockExportJob();
      exportsService.findById.mockResolvedValue(exportJob);

      global.fetch = jest.fn().mockRejectedValue(new Error('Temporary error'));

      const bullJob = createMockBullJob({
        attemptsMade: 0,
        opts: { attempts: 3 },
      } as any);

      await expect(processor.process(bullJob)).rejects.toThrow('Temporary error');

      const failedCalls = exportsService.updateJob.mock.calls.filter(
        (call) => (call[1] as Partial<ExportJob>).status === ExportStatus.FAILED,
      );
      expect(failedCalls).toHaveLength(0);
    });

    it('should handle non-Error exceptions in error message', async () => {
      const exportJob = createMockExportJob();
      exportsService.findById.mockResolvedValue(exportJob);

      global.fetch = jest.fn().mockRejectedValue('string error');

      const bullJob = createMockBullJob({
        attemptsMade: 2,
        opts: { attempts: 3 },
      } as any);

      await expect(processor.process(bullJob)).rejects.toBe('string error');

      expect(exportsService.updateJob).toHaveBeenCalledWith('job-1', expect.objectContaining({
        errorMessage: expect.stringContaining('string error'),
      }));
    });

    it('should clean up temp file in finally block', async () => {
      const exportJob = createMockExportJob();
      exportsService.findById.mockResolvedValue(exportJob);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ id: 1 }] }),
      });

      await processor.process(createMockBullJob());

      expect(fs.promises.unlink).toHaveBeenCalled();
    });

    it('should handle temp file cleanup failure gracefully', async () => {
      const exportJob = createMockExportJob();
      exportsService.findById.mockResolvedValue(exportJob);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ id: 1 }] }),
      });

      (fs.promises.unlink as jest.Mock).mockRejectedValueOnce(new Error('ENOENT'));

      await processor.process(createMockBullJob());

      expect(exportsService.updateJob).toHaveBeenCalledWith('job-1', expect.objectContaining({
        status: ExportStatus.COMPLETED,
      }));
    });

    it('should update progress every 10 pages', async () => {
      const exportJob = createMockExportJob({ pageSize: 1 });
      exportsService.findById.mockResolvedValue(exportJob);

      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount <= 11) {
          return { ok: true, json: async () => ({ data: [{ id: callCount }] }) };
        }
        return { ok: true, json: async () => ({ data: [] }) };
      });

      const bullJob = createMockBullJob();
      await processor.process(bullJob);

      const progressCalls = exportsService.updateJob.mock.calls.filter(
        (call) => {
          const updates = call[1] as Partial<ExportJob>;
          return updates.totalRecords !== undefined && updates.status === undefined;
        },
      );
      expect(progressCalls.length).toBeGreaterThanOrEqual(1);
      expect(bullJob.updateProgress).toHaveBeenCalled();
    });

    it('should handle cursor pagination', async () => {
      const exportJob = createMockExportJob({
        paginationStrategy: PaginationStrategy.CURSOR,
        cursorPath: 'meta.nextCursor',
        cursorParam: 'after',
        pageSize: 2,
      });
      exportsService.findById.mockResolvedValue(exportJob);

      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount <= 2) {
          return {
            ok: true,
            json: async () => ({
              data: [{ id: callCount }, { id: callCount + 10 }],
              meta: { nextCursor: 'cursor-abc' },
            }),
          };
        }
        if (callCount <= 4) {
          return {
            ok: true,
            json: async () => ({
              data: [{ id: 100 }],
              meta: { nextCursor: null },
            }),
          };
        }
        return { ok: true, json: async () => ({ data: [] }) };
      });

      await processor.process(createMockBullJob());

      expect(exportsService.updateJob).toHaveBeenCalledWith('job-1', expect.objectContaining({
        status: ExportStatus.COMPLETED,
      }));
      expect(global.fetch).toHaveBeenCalledTimes(4);
    });

    it('should use default attempts value when opts.attempts is undefined', async () => {
      const exportJob = createMockExportJob();
      exportsService.findById.mockResolvedValue(exportJob);

      global.fetch = jest.fn().mockRejectedValue(new Error('fail'));

      const bullJob = createMockBullJob({
        attemptsMade: 2,
        opts: {} as any,
      } as any);

      await expect(processor.process(bullJob)).rejects.toThrow('fail');

      expect(exportsService.updateJob).toHaveBeenCalledWith('job-1', expect.objectContaining({
        status: ExportStatus.FAILED,
      }));
    });
  });

  describe('buildPageUrl', () => {
    const callBuildPageUrl = (job: ExportJob, page: number, cursor: string | null) =>
      (processor as any).buildPageUrl(job, page, cursor);

    it('should build URL with PAGE strategy', () => {
      const job = createMockExportJob({
        apiUrl: 'https://api.example.com/users',
        pageSize: 50,
      });

      const url = callBuildPageUrl(job, 0, null);
      const parsed = new URL(url);

      expect(parsed.searchParams.get('page')).toBe('1');
      expect(parsed.searchParams.get('limit')).toBe('50');
    });

    it('should build URL with PAGE strategy for page 5', () => {
      const job = createMockExportJob({
        apiUrl: 'https://api.example.com/users',
        pageSize: 100,
      });

      const url = callBuildPageUrl(job, 4, null);
      const parsed = new URL(url);

      expect(parsed.searchParams.get('page')).toBe('5');
      expect(parsed.searchParams.get('limit')).toBe('100');
    });

    it('should build URL with OFFSET strategy', () => {
      const job = createMockExportJob({
        apiUrl: 'https://api.example.com/items',
        paginationStrategy: PaginationStrategy.OFFSET,
        pageSize: 25,
      });

      const url = callBuildPageUrl(job, 3, null);
      const parsed = new URL(url);

      expect(parsed.searchParams.get('offset')).toBe('75');
      expect(parsed.searchParams.get('limit')).toBe('25');
    });

    it('should build URL with CURSOR strategy without cursor', () => {
      const job = createMockExportJob({
        apiUrl: 'https://api.example.com/events',
        paginationStrategy: PaginationStrategy.CURSOR,
        pageSize: 100,
      });

      const url = callBuildPageUrl(job, 0, null);
      const parsed = new URL(url);

      expect(parsed.searchParams.get('limit')).toBe('100');
      expect(parsed.searchParams.has('cursor')).toBe(false);
    });

    it('should build URL with CURSOR strategy with cursor value', () => {
      const job = createMockExportJob({
        apiUrl: 'https://api.example.com/events',
        paginationStrategy: PaginationStrategy.CURSOR,
        cursorParam: 'after',
        pageSize: 100,
      });

      const url = callBuildPageUrl(job, 1, 'abc123');
      const parsed = new URL(url);

      expect(parsed.searchParams.get('limit')).toBe('100');
      expect(parsed.searchParams.get('after')).toBe('abc123');
    });

    it('should use default cursor param name when cursorParam is null', () => {
      const job = createMockExportJob({
        apiUrl: 'https://api.example.com/events',
        paginationStrategy: PaginationStrategy.CURSOR,
        cursorParam: null,
        pageSize: 50,
      });

      const url = callBuildPageUrl(job, 1, 'xyz');
      const parsed = new URL(url);

      expect(parsed.searchParams.get('cursor')).toBe('xyz');
    });

    it('should include queryParams in the URL', () => {
      const job = createMockExportJob({
        apiUrl: 'https://api.example.com/users',
        queryParams: { status: 'active', sort: 'name' },
        pageSize: 10,
      });

      const url = callBuildPageUrl(job, 0, null);
      const parsed = new URL(url);

      expect(parsed.searchParams.get('status')).toBe('active');
      expect(parsed.searchParams.get('sort')).toBe('name');
      expect(parsed.searchParams.get('page')).toBe('1');
    });
  });

  describe('extractByPath', () => {
    const callExtractByPath = (obj: unknown, path: string) =>
      (processor as any).extractByPath(obj, path);

    it('should extract a top-level value', () => {
      expect(callExtractByPath({ data: [1, 2, 3] }, 'data')).toEqual([1, 2, 3]);
    });

    it('should extract a nested value', () => {
      const obj = { response: { results: { items: [{ id: 1 }] } } };
      expect(callExtractByPath(obj, 'response.results.items')).toEqual([{ id: 1 }]);
    });

    it('should return undefined for non-existent path', () => {
      expect(callExtractByPath({ data: [] }, 'missing.path')).toBeUndefined();
    });

    it('should return undefined when intermediate value is null', () => {
      expect(callExtractByPath({ data: null }, 'data.items')).toBeUndefined();
    });

    it('should return undefined when object is null', () => {
      expect(callExtractByPath(null, 'data')).toBeUndefined();
    });

    it('should return undefined when object is a primitive', () => {
      expect(callExtractByPath(42, 'data')).toBeUndefined();
    });
  });

  describe('flattenRecord', () => {
    const callFlattenRecord = (obj: Record<string, unknown>, prefix?: string) =>
      (processor as any).flattenRecord(obj, prefix);

    it('should return flat record with stringified values', () => {
      const record = { id: 1, name: 'Alice', active: true };
      const result = callFlattenRecord(record);

      expect(result).toEqual({ id: '1', name: 'Alice', active: 'true' });
    });

    it('should flatten nested objects with dot notation', () => {
      const record = { user: { name: 'Alice', address: { city: 'NYC' } } };
      const result = callFlattenRecord(record);

      expect(result).toEqual({
        'user.name': 'Alice',
        'user.address.city': 'NYC',
      });
    });

    it('should stringify arrays', () => {
      const record = { tags: ['a', 'b', 'c'] };
      const result = callFlattenRecord(record);

      expect(result).toEqual({ tags: '["a","b","c"]' });
    });

    it('should convert null to empty string', () => {
      const record = { value: null };
      const result = callFlattenRecord(record);

      expect(result).toEqual({ value: '' });
    });

    it('should convert undefined to empty string', () => {
      const record = { value: undefined };
      const result = callFlattenRecord(record);

      expect(result).toEqual({ value: '' });
    });

    it('should handle prefix parameter', () => {
      const record = { name: 'Alice' };
      const result = callFlattenRecord(record, 'user');

      expect(result).toEqual({ 'user.name': 'Alice' });
    });

    it('should handle mixed nested structures', () => {
      const record = {
        id: 42,
        meta: { created: '2026-01-01' },
        tags: [1, 2],
        note: null,
      };
      const result = callFlattenRecord(record);

      expect(result).toEqual({
        id: '42',
        'meta.created': '2026-01-01',
        tags: '[1,2]',
        note: '',
      });
    });
  });

  describe('extractColumns', () => {
    const callExtractColumns = (record: Record<string, unknown>) =>
      (processor as any).extractColumns(record);

    it('should extract column names from a flat record', () => {
      const record = { id: 1, name: 'Alice', email: 'alice@example.com' };
      expect(callExtractColumns(record)).toEqual(['id', 'name', 'email']);
    });

    it('should extract flattened column names from nested record', () => {
      const record = { id: 1, user: { name: 'Alice', profile: { bio: 'Hi' } } };
      expect(callExtractColumns(record)).toEqual(['id', 'user.name', 'user.profile.bio']);
    });
  });

  describe('fetchPage', () => {
    const callFetchPage = (url: string, headers: Record<string, string> | null, dataPath: string) =>
      (processor as any).fetchPage(url, headers, dataPath);

    it('should return parsed data array', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ id: 1 }, { id: 2 }] }),
      });

      const result = await callFetchPage('https://api.example.com/data', null, 'data');
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('should return empty array when data path yields non-array', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'not an array' }),
      });

      const result = await callFetchPage('https://api.example.com/data', null, 'data');
      expect(result).toEqual([]);
    });

    it('should return empty array when data path is missing', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ other: [] }),
      });

      const result = await callFetchPage('https://api.example.com/data', null, 'data');
      expect(result).toEqual([]);
    });

    it('should forward headers to fetch', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await callFetchPage(
        'https://api.example.com/data',
        { Authorization: 'Bearer token' },
        'data',
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token',
            Accept: 'application/json',
          }),
        }),
      );
    });
  });

  describe('fetchRawResponse', () => {
    const callFetchRawResponse = (url: string, headers: Record<string, string> | null) =>
      (processor as any).fetchRawResponse(url, headers);

    it('should return JSON response for successful request', async () => {
      const responseData = { data: [1, 2, 3], meta: { total: 3 } };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => responseData,
      });

      const result = await callFetchRawResponse('https://api.example.com/data', null);
      expect(result).toEqual(responseData);
    });

    it('should throw error for non-ok response', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      await expect(
        callFetchRawResponse('https://api.example.com/data', null),
      ).rejects.toThrow('API responded with 403: Forbidden');
    });

    it('should include Accept header and merge with custom headers', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await callFetchRawResponse('https://api.example.com/data', {
        'X-Custom': 'value',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          method: 'GET',
          headers: { Accept: 'application/json', 'X-Custom': 'value' },
        }),
      );
    });

    it('should use default Accept header when no custom headers', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await callFetchRawResponse('https://api.example.com/data', null);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          headers: { Accept: 'application/json' },
        }),
      );
    });
  });
});
