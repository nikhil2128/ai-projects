import type { SQSEvent } from 'aws-lambda';
import { handler } from './processor';
import { ExportStatus, PaginationStrategy, ExportJob } from '../types';

const mockUnlink = jest.fn().mockResolvedValue(undefined);
const mockCreateReadStream = jest.fn().mockReturnValue({ pipe: jest.fn() });
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  createReadStream: (...args: unknown[]) => mockCreateReadStream(...args),
  promises: {
    ...jest.requireActual('fs').promises,
    unlink: (...args: unknown[]) => mockUnlink(...args),
  },
}));

const mockGetExportJob = jest.fn();
const mockUpdateExportJob = jest.fn();
jest.mock('../services/export-job.service', () => ({
  getExportJob: (...args: unknown[]) => mockGetExportJob(...args),
  updateExportJob: (...args: unknown[]) => mockUpdateExportJob(...args),
}));

const mockUploadStream = jest.fn();
const mockGetPresignedUrl = jest.fn();
jest.mock('../services/s3.service', () => ({
  uploadStream: (...args: unknown[]) => mockUploadStream(...args),
  getPresignedUrl: (...args: unknown[]) => mockGetPresignedUrl(...args),
}));

const mockSendExportReadyEmail = jest.fn();
jest.mock('../services/email.service', () => ({
  sendExportReadyEmail: (...args: unknown[]) =>
    mockSendExportReadyEmail(...args),
}));

const mockFetchAndBuildCsv = jest.fn();
jest.mock('../lib/csv-builder', () => ({
  fetchAndBuildCsv: (...args: unknown[]) => mockFetchAndBuildCsv(...args),
}));

jest.mock('../config', () => ({
  getConfig: () => ({
    export: { maxPages: 100 },
  }),
}));

const createMockExportJob = (
  overrides: Partial<ExportJob> = {},
): ExportJob => ({
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
  createdAt: '2026-01-15T10:00:00.000Z',
  updatedAt: '2026-01-15T10:00:00.000Z',
  ...overrides,
});

function createSqsEvent(
  exportJobId: string,
  receiveCount = '1',
): SQSEvent {
  return {
    Records: [
      {
        messageId: 'msg-1',
        receiptHandle: 'receipt-1',
        body: JSON.stringify({ exportJobId }),
        attributes: {
          ApproximateReceiveCount: receiveCount,
          ApproximateFirstReceiveTimestamp: '0',
          SenderId: 'sender',
          SentTimestamp: '0',
        },
        messageAttributes: {},
        md5OfBody: '',
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs:us-east-1:123:queue',
        awsRegion: 'us-east-1',
      },
    ],
  };
}

describe('Processor Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateExportJob.mockResolvedValue(undefined);
    mockUnlink.mockResolvedValue(undefined);
    mockCreateReadStream.mockReturnValue({ pipe: jest.fn() });
  });

  it('should skip processing when job is not found', async () => {
    mockGetExportJob.mockResolvedValue(null);

    await handler(createSqsEvent('job-1'));

    expect(mockGetExportJob).toHaveBeenCalledWith('job-1');
    expect(mockUpdateExportJob).not.toHaveBeenCalled();
  });

  it('should process a single page export successfully', async () => {
    const exportJob = createMockExportJob();
    mockGetExportJob.mockResolvedValue(exportJob);
    mockFetchAndBuildCsv.mockResolvedValue({
      totalRecords: 2,
      pagesProcessed: 1,
      filePath: '/tmp/export.csv',
    });
    mockUploadStream.mockResolvedValue('exports/job-1/export-job-1.csv');
    mockGetPresignedUrl.mockResolvedValue('https://s3.example.com/presigned');
    mockSendExportReadyEmail.mockResolvedValue(undefined);

    await handler(createSqsEvent('job-1'));

    expect(mockUpdateExportJob).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({ status: ExportStatus.PROCESSING }),
    );
    expect(mockUpdateExportJob).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({
        status: ExportStatus.COMPLETED,
        totalRecords: 2,
        pagesProcessed: 1,
      }),
    );
    expect(mockUploadStream).toHaveBeenCalledWith(
      'exports/job-1/export-job-1.csv',
      expect.anything(),
    );
    expect(mockGetPresignedUrl).toHaveBeenCalledWith(
      'exports/job-1/export-job-1.csv',
    );
    expect(mockSendExportReadyEmail).toHaveBeenCalledWith(
      'user@example.com',
      'https://s3.example.com/presigned',
      'export-job-1.csv',
      2,
    );
  });

  it('should use custom fileName when provided', async () => {
    const exportJob = createMockExportJob({ fileName: 'my-report' });
    mockGetExportJob.mockResolvedValue(exportJob);
    mockFetchAndBuildCsv.mockResolvedValue({
      totalRecords: 1,
      pagesProcessed: 1,
      filePath: '/tmp/export.csv',
    });
    mockUploadStream.mockResolvedValue('exports/job-1/my-report.csv');
    mockGetPresignedUrl.mockResolvedValue('https://s3.example.com/presigned');
    mockSendExportReadyEmail.mockResolvedValue(undefined);

    await handler(createSqsEvent('job-1'));

    expect(mockUploadStream).toHaveBeenCalledWith(
      'exports/job-1/my-report.csv',
      expect.anything(),
    );
    expect(mockSendExportReadyEmail).toHaveBeenCalledWith(
      'user@example.com',
      expect.any(String),
      'my-report.csv',
      1,
    );
  });

  it('should mark job as FAILED on last attempt', async () => {
    const exportJob = createMockExportJob();
    mockGetExportJob.mockResolvedValue(exportJob);
    mockFetchAndBuildCsv.mockRejectedValue(new Error('Network error'));

    await handler(createSqsEvent('job-1', '3'));

    expect(mockUpdateExportJob).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({
        status: ExportStatus.FAILED,
        errorMessage: expect.stringContaining(
          'Failed after 3 attempts',
        ),
      }),
    );
  });

  it('should throw error on non-final attempt to allow SQS retry', async () => {
    const exportJob = createMockExportJob();
    mockGetExportJob.mockResolvedValue(exportJob);
    mockFetchAndBuildCsv.mockRejectedValue(new Error('Temporary error'));

    await expect(handler(createSqsEvent('job-1', '1'))).rejects.toThrow(
      'Temporary error',
    );

    const failedCalls = mockUpdateExportJob.mock.calls.filter(
      (call: any[]) => call[1]?.status === ExportStatus.FAILED,
    );
    expect(failedCalls).toHaveLength(0);
  });

  it('should handle non-Error exceptions in error message', async () => {
    const exportJob = createMockExportJob();
    mockGetExportJob.mockResolvedValue(exportJob);
    mockFetchAndBuildCsv.mockRejectedValue('string error');

    await handler(createSqsEvent('job-1', '3'));

    expect(mockUpdateExportJob).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({
        errorMessage: expect.stringContaining('string error'),
      }),
    );
  });

  it('should clean up temp file after successful processing', async () => {
    const exportJob = createMockExportJob();
    mockGetExportJob.mockResolvedValue(exportJob);
    mockFetchAndBuildCsv.mockResolvedValue({
      totalRecords: 1,
      pagesProcessed: 1,
      filePath: '/tmp/export-test.csv',
    });
    mockUploadStream.mockResolvedValue('key');
    mockGetPresignedUrl.mockResolvedValue('url');
    mockSendExportReadyEmail.mockResolvedValue(undefined);

    await handler(createSqsEvent('job-1'));

    expect(mockUnlink).toHaveBeenCalledWith('/tmp/export-test.csv');
  });

  it('should handle temp file cleanup failure gracefully', async () => {
    const exportJob = createMockExportJob();
    mockGetExportJob.mockResolvedValue(exportJob);
    mockFetchAndBuildCsv.mockResolvedValue({
      totalRecords: 1,
      pagesProcessed: 1,
      filePath: '/tmp/export.csv',
    });
    mockUploadStream.mockResolvedValue('key');
    mockGetPresignedUrl.mockResolvedValue('url');
    mockSendExportReadyEmail.mockResolvedValue(undefined);
    mockUnlink.mockRejectedValueOnce(new Error('ENOENT'));

    await handler(createSqsEvent('job-1'));

    expect(mockUpdateExportJob).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({ status: ExportStatus.COMPLETED }),
    );
  });
});
