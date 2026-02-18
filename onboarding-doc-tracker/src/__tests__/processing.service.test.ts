import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config', () => ({
  config: {
    aws: { region: 'us-east-1', dynamoTable: 'test-table', emailBucket: 'test-bucket' },
    azure: { tenantId: 't', clientId: 'c', clientSecret: 's' },
    hr: { email: 'hr@test.com', userId: 'uid' },
    onedrive: { rootFolder: 'Docs' },
    ses: { fromEmail: 'noreply@test.com' },
  },
}));

const mockParseEmailFromS3 = vi.hoisted(() => vi.fn());
vi.mock('../services/email-parser', () => ({
  parseEmailFromS3: mockParseEmailFromS3,
}));

const mockCreateEmployeeFolder = vi.hoisted(() => vi.fn());
const mockUploadAllDocuments = vi.hoisted(() => vi.fn());
const mockCreateSharingLink = vi.hoisted(() => vi.fn());
vi.mock('../services/onedrive.service', () => ({
  createEmployeeFolder: mockCreateEmployeeFolder,
  uploadAllDocuments: mockUploadAllDocuments,
  createSharingLink: mockCreateSharingLink,
}));

const mockNotifyHrOfUpload = vi.hoisted(() => vi.fn());
vi.mock('../services/notification.service', () => ({
  notifyHrOfUpload: mockNotifyHrOfUpload,
}));

const mockIsAlreadyProcessed = vi.hoisted(() => vi.fn());
const mockSaveProcessingRecord = vi.hoisted(() => vi.fn());
const mockRecordFailure = vi.hoisted(() => vi.fn());
vi.mock('../services/tracking.service', () => ({
  isAlreadyProcessed: mockIsAlreadyProcessed,
  saveProcessingRecord: mockSaveProcessingRecord,
  recordFailure: mockRecordFailure,
}));

import { processEmailFromS3 } from '../services/processing.service';

describe('processEmailFromS3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAlreadyProcessed.mockResolvedValue(false);
    mockSaveProcessingRecord.mockResolvedValue(undefined);
    mockRecordFailure.mockResolvedValue(undefined);
    mockNotifyHrOfUpload.mockResolvedValue(undefined);
  });

  const mockSubmission = {
    messageId: 'msg-123',
    employeeName: 'John Doe',
    employeeEmail: 'john@example.com',
    subject: 'My Documents',
    receivedAt: '2024-01-15T10:00:00.000Z',
    attachments: [
      {
        originalName: 'passport.pdf',
        normalizedName: 'john_doe_passport.pdf',
        contentBytes: 'base64data',
        contentType: 'application/pdf',
        size: 1024,
      },
    ],
  };

  it('processes a new email end-to-end successfully', async () => {
    mockParseEmailFromS3.mockResolvedValue(mockSubmission);
    mockCreateEmployeeFolder.mockResolvedValue({ id: 'folder-id', name: 'John Doe' });
    mockUploadAllDocuments.mockResolvedValue(['john_doe_passport.pdf']);
    mockCreateSharingLink.mockResolvedValue('https://share.link/folder');

    const result = await processEmailFromS3('test-bucket', 'incoming/abc');

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('msg-123');
    expect(result.employeeName).toBe('John Doe');
    expect(result.folderUrl).toBe('https://share.link/folder');
    expect(result.documentsUploaded).toEqual(['john_doe_passport.pdf']);
  });

  it('calls all pipeline stages in order', async () => {
    mockParseEmailFromS3.mockResolvedValue(mockSubmission);
    mockCreateEmployeeFolder.mockResolvedValue({ id: 'fid' });
    mockUploadAllDocuments.mockResolvedValue(['doc.pdf']);
    mockCreateSharingLink.mockResolvedValue('https://link');

    await processEmailFromS3('bucket', 'key');

    expect(mockParseEmailFromS3).toHaveBeenCalledWith('bucket', 'key');
    expect(mockIsAlreadyProcessed).toHaveBeenCalledWith('msg-123');
    expect(mockCreateEmployeeFolder).toHaveBeenCalledWith('John Doe');
    expect(mockUploadAllDocuments).toHaveBeenCalledWith('fid', mockSubmission.attachments);
    expect(mockCreateSharingLink).toHaveBeenCalledWith('fid');
    expect(mockNotifyHrOfUpload).toHaveBeenCalledOnce();
    expect(mockSaveProcessingRecord).toHaveBeenCalledOnce();
  });

  it('saves a tracking record with correct shape', async () => {
    mockParseEmailFromS3.mockResolvedValue(mockSubmission);
    mockCreateEmployeeFolder.mockResolvedValue({ id: 'fid' });
    mockUploadAllDocuments.mockResolvedValue(['doc.pdf']);
    mockCreateSharingLink.mockResolvedValue('https://link');

    await processEmailFromS3('bucket', 'key');

    const savedRecord = mockSaveProcessingRecord.mock.calls[0][0];
    expect(savedRecord.messageId).toBe('msg-123');
    expect(savedRecord.employeeName).toBe('John Doe');
    expect(savedRecord.employeeEmail).toBe('john@example.com');
    expect(savedRecord.folderUrl).toBe('https://link');
    expect(savedRecord.documentsUploaded).toEqual(['doc.pdf']);
    expect(savedRecord.status).toBe('processed');
    expect(savedRecord.processedAt).toBeDefined();
  });

  it('skips processing for already-processed emails', async () => {
    mockParseEmailFromS3.mockResolvedValue(mockSubmission);
    mockIsAlreadyProcessed.mockResolvedValue(true);

    const result = await processEmailFromS3('bucket', 'key');

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('msg-123');
    expect(result.employeeName).toBe('John Doe');
    expect(mockCreateEmployeeFolder).not.toHaveBeenCalled();
    expect(mockUploadAllDocuments).not.toHaveBeenCalled();
    expect(mockNotifyHrOfUpload).not.toHaveBeenCalled();
    expect(mockSaveProcessingRecord).not.toHaveBeenCalled();
  });

  it('handles parse failure and records it', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockParseEmailFromS3.mockRejectedValue(new Error('Malformed email'));

    const result = await processEmailFromS3('bucket', 'bad-key');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Malformed email');
    expect(result.messageId).toBe('bad-key');
    expect(mockRecordFailure).toHaveBeenCalledWith(
      'bad-key', '', '', 'Malformed email'
    );
    consoleSpy.mockRestore();
  });

  it('handles OneDrive upload failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockParseEmailFromS3.mockResolvedValue(mockSubmission);
    mockCreateEmployeeFolder.mockRejectedValue(new Error('Graph API down'));

    const result = await processEmailFromS3('bucket', 'key');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Graph API down');
    expect(mockRecordFailure).toHaveBeenCalledWith(
      'msg-123', '', '', 'Graph API down'
    );
    consoleSpy.mockRestore();
  });

  it('handles notification failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockParseEmailFromS3.mockResolvedValue(mockSubmission);
    mockCreateEmployeeFolder.mockResolvedValue({ id: 'fid' });
    mockUploadAllDocuments.mockResolvedValue(['doc.pdf']);
    mockCreateSharingLink.mockResolvedValue('https://link');
    mockNotifyHrOfUpload.mockRejectedValue(new Error('SES unavailable'));

    const result = await processEmailFromS3('bucket', 'key');

    expect(result.success).toBe(false);
    expect(result.error).toBe('SES unavailable');
    consoleSpy.mockRestore();
  });

  it('handles non-Error thrown values', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockParseEmailFromS3.mockRejectedValue('string error');

    const result = await processEmailFromS3('bucket', 'key');

    expect(result.success).toBe(false);
    expect(result.error).toBe('string error');
    consoleSpy.mockRestore();
  });
});
