import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config', () => ({
  config: {
    aws: { region: 'us-east-1' },
    ses: { fromEmail: 'test-from@test.com' },
    hr: { email: 'hr@test.com', userId: 'test-user-id' },
  },
}));

const mockSESSend = vi.hoisted(() => vi.fn());
vi.mock('@aws-sdk/client-ses', () => ({
  SESClient: vi.fn(() => ({ send: mockSESSend })),
  SendEmailCommand: vi.fn((input: unknown) => input),
}));

import { notifyHrOfUpload } from '../services/notification.service';
import { ProcessingResult } from '../types';

describe('notifyHrOfUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSESSend.mockResolvedValue({});
  });

  const sampleResult: ProcessingResult = {
    messageId: 'msg-123',
    employeeName: 'John Doe',
    employeeEmail: 'john@example.com',
    folderUrl: 'https://onedrive.com/folder/john-doe',
    documentsUploaded: ['john_doe_passport.pdf', 'john_doe_dl.pdf'],
    processedAt: '2024-01-15T10:00:00.000Z',
  };

  it('sends an email notification to HR', async () => {
    await notifyHrOfUpload(sampleResult);

    expect(mockSESSend).toHaveBeenCalledOnce();
    const command = mockSESSend.mock.calls[0][0];
    expect(command.Source).toBe('test-from@test.com');
    expect(command.Destination.ToAddresses).toEqual(['hr@test.com']);
  });

  it('includes employee name in the subject line', async () => {
    await notifyHrOfUpload(sampleResult);

    const command = mockSESSend.mock.calls[0][0];
    expect(command.Message.Subject.Data).toContain('John Doe');
    expect(command.Message.Subject.Charset).toBe('UTF-8');
  });

  it('includes all uploaded document names in the HTML body', async () => {
    await notifyHrOfUpload(sampleResult);

    const command = mockSESSend.mock.calls[0][0];
    const htmlBody = command.Message.Body.Html.Data;
    expect(htmlBody).toContain('john_doe_passport.pdf');
    expect(htmlBody).toContain('john_doe_dl.pdf');
  });

  it('includes OneDrive folder link in the HTML body', async () => {
    await notifyHrOfUpload(sampleResult);

    const command = mockSESSend.mock.calls[0][0];
    const htmlBody = command.Message.Body.Html.Data;
    expect(htmlBody).toContain('https://onedrive.com/folder/john-doe');
  });

  it('includes employee email and name in the body', async () => {
    await notifyHrOfUpload(sampleResult);

    const command = mockSESSend.mock.calls[0][0];
    const htmlBody = command.Message.Body.Html.Data;
    expect(htmlBody).toContain('John Doe');
    expect(htmlBody).toContain('john@example.com');
  });

  it('propagates SES errors', async () => {
    mockSESSend.mockRejectedValue(new Error('SES rate limit'));

    await expect(notifyHrOfUpload(sampleResult)).rejects.toThrow(
      'SES rate limit'
    );
  });
});
