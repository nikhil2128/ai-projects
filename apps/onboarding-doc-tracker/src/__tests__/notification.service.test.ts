import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Tenant } from '../types';

vi.mock('../config', () => ({
  config: {
    aws: { region: 'us-east-1' },
    processing: { retryMaxAttempts: 1, retryBaseDelayMs: 10 },
  },
}));

const mockSESSend = vi.hoisted(() => vi.fn());
vi.mock('@aws-sdk/client-ses', () => ({
  SESClient: vi.fn(() => ({ send: mockSESSend })),
  SendEmailCommand: vi.fn((input: unknown) => input),
}));

import { notifyHrOfUpload } from '../services/notification.service';
import { ProcessingResult } from '../types';

const testTenant: Tenant = {
  tenantId: 'tenant-001',
  companyName: 'Test Corp',
  receivingEmail: 'onboarding@testcorp.com',
  hrEmail: 'hr@testcorp.com',
  hrUserId: 'test-user-id',
  azureTenantId: 'azure-tenant-id',
  azureClientId: 'azure-client-id',
  azureClientSecretArn: 'arn:aws:secretsmanager:us-east-1:123456:secret:azure-client-secret',
  oneDriveRootFolder: 'Onboarding Documents',
  sesFromEmail: 'noreply@testcorp.com',
  status: 'active',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('notifyHrOfUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSESSend.mockResolvedValue({});
  });

  const sampleResult: ProcessingResult = {
    tenantId: 'tenant-001',
    messageId: 'msg-123',
    employeeName: 'John Doe',
    employeeEmail: 'john@example.com',
    folderUrl: 'https://onedrive.com/folder/john-doe',
    documentsUploaded: ['john_doe_passport.pdf', 'john_doe_dl.pdf'],
    processedAt: '2024-01-15T10:00:00.000Z',
  };

  it('sends an email notification to tenant HR', async () => {
    await notifyHrOfUpload(sampleResult, testTenant);

    expect(mockSESSend).toHaveBeenCalledOnce();
    const command = mockSESSend.mock.calls[0][0];
    expect(command.Source).toBe('noreply@testcorp.com');
    expect(command.Destination.ToAddresses).toEqual(['hr@testcorp.com']);
  });

  it('includes employee name in the subject line', async () => {
    await notifyHrOfUpload(sampleResult, testTenant);

    const command = mockSESSend.mock.calls[0][0];
    expect(command.Message.Subject.Data).toContain('John Doe');
    expect(command.Message.Subject.Charset).toBe('UTF-8');
  });

  it('includes company name in the HTML body', async () => {
    await notifyHrOfUpload(sampleResult, testTenant);

    const command = mockSESSend.mock.calls[0][0];
    const htmlBody = command.Message.Body.Html.Data;
    expect(htmlBody).toContain('Test Corp');
  });

  it('includes all uploaded document names in the HTML body', async () => {
    await notifyHrOfUpload(sampleResult, testTenant);

    const command = mockSESSend.mock.calls[0][0];
    const htmlBody = command.Message.Body.Html.Data;
    expect(htmlBody).toContain('john_doe_passport.pdf');
    expect(htmlBody).toContain('john_doe_dl.pdf');
  });

  it('includes OneDrive folder link in the HTML body', async () => {
    await notifyHrOfUpload(sampleResult, testTenant);

    const command = mockSESSend.mock.calls[0][0];
    const htmlBody = command.Message.Body.Html.Data;
    expect(htmlBody).toContain('https://onedrive.com/folder/john-doe');
  });

  it('uses different tenant configs for different tenants', async () => {
    const otherTenant: Tenant = {
      ...testTenant,
      tenantId: 'tenant-002',
      companyName: 'Other Corp',
      hrEmail: 'hr@othercorp.com',
      sesFromEmail: 'noreply@othercorp.com',
    };

    await notifyHrOfUpload(sampleResult, otherTenant);

    const command = mockSESSend.mock.calls[0][0];
    expect(command.Source).toBe('noreply@othercorp.com');
    expect(command.Destination.ToAddresses).toEqual(['hr@othercorp.com']);
  });

  it('propagates SES errors', async () => {
    mockSESSend.mockRejectedValue(new Error('SES rate limit'));

    await expect(notifyHrOfUpload(sampleResult, testTenant)).rejects.toThrow(
      'SES rate limit'
    );
  });
});
