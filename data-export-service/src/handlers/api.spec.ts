import type { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './api';
import { ExportStatus, PaginationStrategy } from '../types';

const mockCreateExportJob = jest.fn();
const mockGetExportJob = jest.fn();
const mockToStatusResponse = jest.fn();
jest.mock('../services/export-job.service', () => ({
  createExportJob: (...args: unknown[]) => mockCreateExportJob(...args),
  getExportJob: (...args: unknown[]) => mockGetExportJob(...args),
  toStatusResponse: (...args: unknown[]) => mockToStatusResponse(...args),
}));

const mockEnqueueExportJob = jest.fn();
jest.mock('../services/queue.service', () => ({
  enqueueExportJob: (...args: unknown[]) => mockEnqueueExportJob(...args),
}));

jest.mock('../config', () => ({
  getConfig: () => ({
    export: { defaultPageSize: 500 },
  }),
}));

const TEST_UUID = '550e8400-e29b-41d4-a716-446655440000';

function createApiEvent(
  overrides: Partial<APIGatewayProxyEvent> = {},
): APIGatewayProxyEvent {
  return {
    httpMethod: 'GET',
    path: '/api/v1/exports',
    resource: '/api/v1/exports',
    body: null,
    headers: {},
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    pathParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    isBase64Encoded: false,
    ...overrides,
  };
}

describe('API Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/exports', () => {
    const mockStatusResponse = {
      id: TEST_UUID,
      status: ExportStatus.PENDING,
      totalRecords: 0,
      pagesProcessed: 0,
      downloadUrl: null,
      errorMessage: null,
      createdAt: '2026-01-15T10:00:00.000Z',
      startedAt: null,
      completedAt: null,
    };

    it('should accept a valid export request and return 202', async () => {
      const mockJob = { id: TEST_UUID, apiUrl: 'https://api.example.com/data' };
      mockCreateExportJob.mockResolvedValue(mockJob);
      mockEnqueueExportJob.mockResolvedValue(undefined);
      mockToStatusResponse.mockReturnValue(mockStatusResponse);

      const event = createApiEvent({
        httpMethod: 'POST',
        resource: '/api/v1/exports',
        path: '/api/v1/exports',
        body: JSON.stringify({
          apiUrl: 'https://api.example.com/data',
          email: 'user@example.com',
        }),
      });

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(202);
      expect(body.id).toBe(TEST_UUID);
      expect(body.status).toBe(ExportStatus.PENDING);
      expect(mockEnqueueExportJob).toHaveBeenCalledWith(TEST_UUID);
    });

    it('should accept request with all optional fields', async () => {
      const mockJob = { id: TEST_UUID };
      mockCreateExportJob.mockResolvedValue(mockJob);
      mockEnqueueExportJob.mockResolvedValue(undefined);
      mockToStatusResponse.mockReturnValue(mockStatusResponse);

      const event = createApiEvent({
        httpMethod: 'POST',
        resource: '/api/v1/exports',
        path: '/api/v1/exports',
        body: JSON.stringify({
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
        }),
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(202);
      expect(mockCreateExportJob).toHaveBeenCalled();
    });

    it('should return 400 for missing required fields', async () => {
      const event = createApiEvent({
        httpMethod: 'POST',
        resource: '/api/v1/exports',
        path: '/api/v1/exports',
        body: JSON.stringify({}),
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });

    it('should return 400 for invalid email', async () => {
      const event = createApiEvent({
        httpMethod: 'POST',
        resource: '/api/v1/exports',
        path: '/api/v1/exports',
        body: JSON.stringify({
          apiUrl: 'https://api.example.com/data',
          email: 'not-an-email',
        }),
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });

    it('should return 400 for invalid URL', async () => {
      const event = createApiEvent({
        httpMethod: 'POST',
        resource: '/api/v1/exports',
        path: '/api/v1/exports',
        body: JSON.stringify({
          apiUrl: '://missing-protocol',
          email: 'user@example.com',
        }),
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });

    it('should return 400 for pageSize out of range', async () => {
      const event = createApiEvent({
        httpMethod: 'POST',
        resource: '/api/v1/exports',
        path: '/api/v1/exports',
        body: JSON.stringify({
          apiUrl: 'https://api.example.com/data',
          email: 'user@example.com',
          pageSize: 10000,
        }),
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });

    it('should return 400 for invalid pagination strategy', async () => {
      const event = createApiEvent({
        httpMethod: 'POST',
        resource: '/api/v1/exports',
        path: '/api/v1/exports',
        body: JSON.stringify({
          apiUrl: 'https://api.example.com/data',
          email: 'user@example.com',
          paginationStrategy: 'invalid',
        }),
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });

    it('should return 400 for non-whitelisted fields', async () => {
      const event = createApiEvent({
        httpMethod: 'POST',
        resource: '/api/v1/exports',
        path: '/api/v1/exports',
        body: JSON.stringify({
          apiUrl: 'https://api.example.com/data',
          email: 'user@example.com',
          unknownField: 'should be rejected',
        }),
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });

    it('should return 400 for invalid JSON body', async () => {
      const event = createApiEvent({
        httpMethod: 'POST',
        resource: '/api/v1/exports',
        path: '/api/v1/exports',
        body: 'not json',
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/exports/:id', () => {
    it('should return 200 with job status for existing job', async () => {
      const completedResponse = {
        id: TEST_UUID,
        status: ExportStatus.COMPLETED,
        totalRecords: 1500,
        pagesProcessed: 3,
        downloadUrl: 'https://s3.example.com/download',
        errorMessage: null,
        createdAt: '2026-01-15T10:00:00.000Z',
        startedAt: '2026-01-15T10:01:00.000Z',
        completedAt: '2026-01-15T10:05:00.000Z',
      };

      const mockJob = { id: TEST_UUID, status: ExportStatus.COMPLETED };
      mockGetExportJob.mockResolvedValue(mockJob);
      mockToStatusResponse.mockReturnValue(completedResponse);

      const event = createApiEvent({
        httpMethod: 'GET',
        resource: '/api/v1/exports/{id}',
        path: `/api/v1/exports/${TEST_UUID}`,
        pathParameters: { id: TEST_UUID },
      });

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.id).toBe(TEST_UUID);
      expect(body.status).toBe(ExportStatus.COMPLETED);
      expect(body.totalRecords).toBe(1500);
      expect(body.downloadUrl).toBe('https://s3.example.com/download');
    });

    it('should return 404 for non-existent job', async () => {
      mockGetExportJob.mockResolvedValue(null);

      const event = createApiEvent({
        httpMethod: 'GET',
        resource: '/api/v1/exports/{id}',
        path: `/api/v1/exports/${TEST_UUID}`,
        pathParameters: { id: TEST_UUID },
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      const event = createApiEvent({
        httpMethod: 'GET',
        resource: '/api/v1/exports/{id}',
        path: '/api/v1/exports/not-a-uuid',
        pathParameters: { id: 'not-a-uuid' },
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });

    it('should return failed job status with error message', async () => {
      const failedResponse = {
        id: TEST_UUID,
        status: ExportStatus.FAILED,
        totalRecords: 0,
        pagesProcessed: 0,
        downloadUrl: null,
        errorMessage: 'API returned 500',
        createdAt: '2026-01-15T10:00:00.000Z',
        startedAt: null,
        completedAt: null,
      };

      mockGetExportJob.mockResolvedValue({
        id: TEST_UUID,
        status: ExportStatus.FAILED,
      });
      mockToStatusResponse.mockReturnValue(failedResponse);

      const event = createApiEvent({
        httpMethod: 'GET',
        resource: '/api/v1/exports/{id}',
        path: `/api/v1/exports/${TEST_UUID}`,
        pathParameters: { id: TEST_UUID },
      });

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.status).toBe(ExportStatus.FAILED);
      expect(body.errorMessage).toBe('API returned 500');
    });

    it('should return processing job status', async () => {
      const processingResponse = {
        id: TEST_UUID,
        status: ExportStatus.PROCESSING,
        totalRecords: 500,
        pagesProcessed: 1,
        downloadUrl: null,
        errorMessage: null,
        createdAt: '2026-01-15T10:00:00.000Z',
        startedAt: '2026-01-15T10:01:00.000Z',
        completedAt: null,
      };

      mockGetExportJob.mockResolvedValue({
        id: TEST_UUID,
        status: ExportStatus.PROCESSING,
      });
      mockToStatusResponse.mockReturnValue(processingResponse);

      const event = createApiEvent({
        httpMethod: 'GET',
        resource: '/api/v1/exports/{id}',
        path: `/api/v1/exports/${TEST_UUID}`,
        pathParameters: { id: TEST_UUID },
      });

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.status).toBe(ExportStatus.PROCESSING);
      expect(body.totalRecords).toBe(500);
    });
  });

  describe('OPTIONS (CORS)', () => {
    it('should return 200 for OPTIONS requests', async () => {
      const event = createApiEvent({
        httpMethod: 'OPTIONS',
        resource: '/api/v1/exports',
        path: '/api/v1/exports',
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(200);
      expect(result.headers).toEqual(
        expect.objectContaining({
          'Access-Control-Allow-Origin': '*',
        }),
      );
    });
  });

  describe('Unknown routes', () => {
    it('should return 404 for unknown routes', async () => {
      const event = createApiEvent({
        httpMethod: 'DELETE',
        resource: '/api/v1/exports',
        path: '/api/v1/exports',
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(404);
    });
  });

  describe('Internal errors', () => {
    it('should return 500 when service throws', async () => {
      mockCreateExportJob.mockRejectedValue(new Error('DB connection failed'));

      const event = createApiEvent({
        httpMethod: 'POST',
        resource: '/api/v1/exports',
        path: '/api/v1/exports',
        body: JSON.stringify({
          apiUrl: 'https://api.example.com/data',
          email: 'user@example.com',
        }),
      });

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(500);
      expect(body.message).toBe('Internal server error');
    });
  });
});
