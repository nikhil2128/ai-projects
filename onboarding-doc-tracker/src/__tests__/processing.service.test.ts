import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Tenant } from '../types';

vi.mock('../config', () => ({
  config: {
    aws: { region: 'us-east-1', dynamoTable: 'test-table', tenantsTable: 'test-tenants', emailBucket: 'test-bucket' },
    processing: { uploadConcurrency: 3, retryMaxAttempts: 1, retryBaseDelayMs: 10, retryMaxDelayMs: 100 },
  },
}));

const mockParseEmailFromS3 = vi.hoisted(() => vi.fn());
vi.mock('../services/email-parser', () => ({
  parseEmailFromS3: mockParseEmailFromS3,
}));

const mockGetTenantByReceivingEmail = vi.hoisted(() => vi.fn());
vi.mock('../services/tenant.service', () => ({
  getTenantByReceivingEmail: mockGetTenantByReceivingEmail,
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

const testTenant: Tenant = {
  tenantId: 'tenant-001',
  companyName: 'Test Corp',
  receivingEmail: 'onboarding@testcorp.com',
  hrEmail: 'hr@testcorp.com',
  hrUserId: 'test-user-id',
  azureTenantId: 'azure-tenant-id',
  azureClientId: 'azure-client-id',
  azureClientSecret: 'azure-client-secret',
  oneDriveRootFolder: 'Onboarding Documents',
  sesFromEmail: 'noreply@testcorp.com',
  status: 'active',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('processEmailFromS3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAlreadyProcessed.mockResolvedValue(false);
    mockSaveProcessingRecord.mockResolvedValue(undefined);
    mockRecordFailure.mockResolvedValue(undefined);
    mockNotifyHrOfUpload.mockResolvedValue(undefined);
    mockGetTenantByReceivingEmail.mockResolvedValue(testTenant);
  });

  const mockSubmission = {
    messageId: 'msg-123',
    recipientEmail: 'onboarding@testcorp.com',
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
    mockUploadAllDocuments.mockResolvedValue({ uploaded: ['john_doe_passport.pdf'], failed: [] });
    mockCreateSharingLink.mockResolvedValue('https://share.link/folder');

    const result = await processEmailFromS3('test-bucket', 'incoming/abc');

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('msg-123');
    expect(result.tenantId).toBe('tenant-001');
    expect(result.employeeName).toBe('John Doe');
    expect(result.folderUrl).toBe('https://share.link/folder');
    expect(result.documentsUploaded).toEqual(['john_doe_passport.pdf']);
  });

  it('resolves tenant from recipient email', async () => {
    mockParseEmailFromS3.mockResolvedValue(mockSubmission);
    mockCreateEmployeeFolder.mockResolvedValue({ id: 'fid' });
    mockUploadAllDocuments.mockResolvedValue({ uploaded: ['doc.pdf'], failed: [] });
    mockCreateSharingLink.mockResolvedValue('https://link');

    await processEmailFromS3('bucket', 'key');

    expect(mockGetTenantByReceivingEmail).toHaveBeenCalledWith('onboarding@testcorp.com');
  });

  it('passes tenant to all downstream services', async () => {
    mockParseEmailFromS3.mockResolvedValue(mockSubmission);
    mockCreateEmployeeFolder.mockResolvedValue({ id: 'fid' });
    mockUploadAllDocuments.mockResolvedValue({ uploaded: ['doc.pdf'], failed: [] });
    mockCreateSharingLink.mockResolvedValue('https://link');

    await processEmailFromS3('bucket', 'key');

    expect(mockCreateEmployeeFolder).toHaveBeenCalledWith('John Doe', testTenant);
    expect(mockUploadAllDocuments).toHaveBeenCalledWith('fid', mockSubmission.attachments, testTenant);
    expect(mockCreateSharingLink).toHaveBeenCalledWith('fid', testTenant);
    expect(mockNotifyHrOfUpload).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-001' }),
      testTenant
    );
  });

  it('saves a tracking record with tenantId', async () => {
    mockParseEmailFromS3.mockResolvedValue(mockSubmission);
    mockCreateEmployeeFolder.mockResolvedValue({ id: 'fid' });
    mockUploadAllDocuments.mockResolvedValue({ uploaded: ['doc.pdf'], failed: [] });
    mockCreateSharingLink.mockResolvedValue('https://link');

    await processEmailFromS3('bucket', 'key');

    const savedRecord = mockSaveProcessingRecord.mock.calls[0][0];
    expect(savedRecord.tenantId).toBe('tenant-001');
    expect(savedRecord.messageId).toBe('msg-123');
    expect(savedRecord.employeeName).toBe('John Doe');
    expect(savedRecord.status).toBe('processed');
  });

  it('fails when no tenant matches the recipient email', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockParseEmailFromS3.mockResolvedValue(mockSubmission);
    mockGetTenantByReceivingEmail.mockResolvedValue(null);

    const result = await processEmailFromS3('bucket', 'key');

    expect(result.success).toBe(false);
    expect(result.error).toContain('No tenant registered');
    expect(result.failedAtStep).toBe('tenant-resolution');
    consoleSpy.mockRestore();
  });

  it('fails when tenant is inactive', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockParseEmailFromS3.mockResolvedValue(mockSubmission);
    mockGetTenantByReceivingEmail.mockResolvedValue({ ...testTenant, status: 'inactive' });

    const result = await processEmailFromS3('bucket', 'key');

    expect(result.success).toBe(false);
    expect(result.error).toContain('inactive');
    consoleSpy.mockRestore();
  });

  it('skips processing for already-processed emails', async () => {
    mockParseEmailFromS3.mockResolvedValue(mockSubmission);
    mockIsAlreadyProcessed.mockResolvedValue(true);

    const result = await processEmailFromS3('bucket', 'key');

    expect(result.success).toBe(true);
    expect(result.tenantId).toBe('tenant-001');
    expect(result.messageId).toBe('msg-123');
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
      'unknown', 'bad-key', '', '', 'Malformed email'
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
      'tenant-001', 'msg-123', 'John Doe', 'john@example.com', 'Graph API down'
    );
    consoleSpy.mockRestore();
  });

  it('continues when HR notification fails (non-critical)', async () => {
    mockParseEmailFromS3.mockResolvedValue(mockSubmission);
    mockCreateEmployeeFolder.mockResolvedValue({ id: 'fid' });
    mockUploadAllDocuments.mockResolvedValue({ uploaded: ['doc.pdf'], failed: [] });
    mockCreateSharingLink.mockResolvedValue('https://link');
    mockNotifyHrOfUpload.mockRejectedValue(new Error('SES unavailable'));

    const result = await processEmailFromS3('bucket', 'key');

    expect(result.success).toBe(true);
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('HR notification failed')])
    );
    expect(mockSaveProcessingRecord).toHaveBeenCalledOnce();
  });

  it('handles non-Error thrown values', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockParseEmailFromS3.mockRejectedValue('string error');

    const result = await processEmailFromS3('bucket', 'key');

    expect(result.success).toBe(false);
    expect(result.error).toBe('string error');
    consoleSpy.mockRestore();
  });

  it('handles partial upload failures with warnings', async () => {
    mockParseEmailFromS3.mockResolvedValue(mockSubmission);
    mockCreateEmployeeFolder.mockResolvedValue({ id: 'fid' });
    mockUploadAllDocuments.mockResolvedValue({
      uploaded: ['doc1.pdf'],
      failed: [{ name: 'doc2.pdf', error: 'Timeout' }],
    });
    mockCreateSharingLink.mockResolvedValue('https://link');

    const result = await processEmailFromS3('bucket', 'key');

    expect(result.success).toBe(true);
    expect(result.documentsFailed).toEqual([{ name: 'doc2.pdf', error: 'Timeout' }]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('Upload failed for doc2.pdf')])
    );
  });

  it('fails when all documents fail to upload', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockParseEmailFromS3.mockResolvedValue(mockSubmission);
    mockCreateEmployeeFolder.mockResolvedValue({ id: 'fid' });
    mockUploadAllDocuments.mockResolvedValue({
      uploaded: [],
      failed: [{ name: 'passport.pdf', error: 'Graph error' }],
    });

    const result = await processEmailFromS3('bucket', 'key');

    expect(result.success).toBe(false);
    expect(result.error).toContain('All 1 document(s) failed to upload');
    consoleSpy.mockRestore();
  });
});
