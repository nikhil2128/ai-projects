import { ExportStatus, PaginationStrategy } from '../types';
import {
  createExportJob,
  getExportJob,
  updateExportJob,
  toStatusResponse,
  resetClient,
} from './export-job.service';

const mockSend = jest.fn();
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn().mockImplementation(() => ({ send: mockSend })),
  },
  PutCommand: jest.fn().mockImplementation((params) => ({
    _type: 'Put',
    ...params,
  })),
  GetCommand: jest.fn().mockImplementation((params) => ({
    _type: 'Get',
    ...params,
  })),
  UpdateCommand: jest.fn().mockImplementation((params) => ({
    _type: 'Update',
    ...params,
  })),
}));

jest.mock('uuid', () => ({ v4: () => 'mock-uuid-1234' }));

describe('ExportJobService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetClient();
    mockSend.mockReset();
  });

  describe('createExportJob', () => {
    it('should create a job with defaults', async () => {
      mockSend.mockResolvedValue({});

      const job = await createExportJob(
        {
          apiUrl: 'https://api.example.com/users',
          email: 'user@example.com',
        },
        500,
      );

      expect(job.id).toBe('mock-uuid-1234');
      expect(job.status).toBe(ExportStatus.PENDING);
      expect(job.apiUrl).toBe('https://api.example.com/users');
      expect(job.email).toBe('user@example.com');
      expect(job.paginationStrategy).toBe(PaginationStrategy.PAGE);
      expect(job.pageSize).toBe(500);
      expect(job.dataPath).toBe('data');
      expect(job.headers).toBeNull();
      expect(job.queryParams).toBeNull();
      expect(job.totalRecords).toBe(0);
      expect(job.pagesProcessed).toBe(0);

      const { PutCommand } = require('@aws-sdk/lib-dynamodb');
      expect(PutCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Item: expect.objectContaining({
            id: 'mock-uuid-1234',
            status: ExportStatus.PENDING,
          }),
        }),
      );
    });

    it('should create a job with custom values', async () => {
      mockSend.mockResolvedValue({});

      const job = await createExportJob(
        {
          apiUrl: 'https://api.example.com/orders',
          email: 'admin@example.com',
          paginationStrategy: PaginationStrategy.CURSOR,
          headers: { Authorization: 'Bearer token' },
          queryParams: { status: 'active' },
          pageSize: 100,
          dataPath: 'results.items',
          cursorPath: 'meta.next',
          cursorParam: 'after',
          fileName: 'orders-report',
        },
        500,
      );

      expect(job.paginationStrategy).toBe(PaginationStrategy.CURSOR);
      expect(job.pageSize).toBe(100);
      expect(job.dataPath).toBe('results.items');
      expect(job.headers).toEqual({ Authorization: 'Bearer token' });
      expect(job.fileName).toBe('orders-report');
    });
  });

  describe('getExportJob', () => {
    it('should return the job when found', async () => {
      const mockJob = {
        id: 'test-id',
        status: ExportStatus.COMPLETED,
      };
      mockSend.mockResolvedValue({ Item: mockJob });

      const result = await getExportJob('test-id');
      expect(result).toEqual(mockJob);
    });

    it('should return null when not found', async () => {
      mockSend.mockResolvedValue({});

      const result = await getExportJob('missing-id');
      expect(result).toBeNull();
    });
  });

  describe('updateExportJob', () => {
    it('should update the job with provided fields', async () => {
      mockSend.mockResolvedValue({});

      await updateExportJob('test-id', {
        status: ExportStatus.PROCESSING,
        startedAt: '2026-01-15T10:00:00.000Z',
      });

      const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');
      expect(UpdateCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Key: { id: 'test-id' },
          UpdateExpression: expect.stringContaining('SET'),
        }),
      );
    });
  });

  describe('toStatusResponse', () => {
    it('should map ExportJob to ExportStatusResponse', () => {
      const job = {
        id: 'test-id',
        status: ExportStatus.COMPLETED,
        totalRecords: 1500,
        pagesProcessed: 3,
        downloadUrl: 'https://s3.example.com/download',
        errorMessage: null,
        createdAt: '2026-01-15T10:00:00.000Z',
        startedAt: '2026-01-15T10:01:00.000Z',
        completedAt: '2026-01-15T10:05:00.000Z',
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
        s3Key: 'exports/test-id/export.csv',
        attempts: 1,
        updatedAt: '2026-01-15T10:05:00.000Z',
      };

      const response = toStatusResponse(job);

      expect(response).toEqual({
        id: 'test-id',
        status: ExportStatus.COMPLETED,
        totalRecords: 1500,
        pagesProcessed: 3,
        downloadUrl: 'https://s3.example.com/download',
        errorMessage: null,
        createdAt: '2026-01-15T10:00:00.000Z',
        startedAt: '2026-01-15T10:01:00.000Z',
        completedAt: '2026-01-15T10:05:00.000Z',
      });

      expect(response).not.toHaveProperty('apiUrl');
      expect(response).not.toHaveProperty('s3Key');
    });
  });
});
