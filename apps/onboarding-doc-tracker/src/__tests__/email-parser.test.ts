import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config', () => ({
  config: {
    aws: { region: 'us-east-1' },
    processing: { retryMaxAttempts: 1, retryBaseDelayMs: 10 },
  },
}));

const mockS3Send = vi.hoisted(() => vi.fn());
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({ send: mockS3Send })),
  GetObjectCommand: vi.fn((input: unknown) => input),
}));

const mockSimpleParser = vi.hoisted(() => vi.fn());
vi.mock('mailparser', () => ({
  simpleParser: mockSimpleParser,
}));

const mockNormalizeBatch = vi.hoisted(() => vi.fn());
vi.mock('../services/document-normalizer', () => ({
  normalizeDocumentBatch: mockNormalizeBatch,
}));

import { parseEmailFromS3 } from '../services/email-parser';

describe('parseEmailFromS3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockS3Response(rawEmail: string) {
    mockS3Send.mockResolvedValue({
      Body: {
        transformToString: vi.fn().mockResolvedValue(rawEmail),
      },
    });
  }

  function makeParsedEmail(overrides: Record<string, unknown> = {}) {
    return {
      messageId: '<msg-123@test.com>',
      from: {
        value: [{ name: 'John Doe', address: 'john@example.com' }],
      },
      to: {
        value: [{ address: 'onboarding@company.com' }],
      },
      subject: 'My Onboarding Documents',
      date: new Date('2024-01-15T10:00:00Z'),
      attachments: [
        {
          filename: 'passport.pdf',
          contentType: 'application/pdf',
          content: Buffer.from('pdf-content-1'),
          size: 1024,
        },
      ],
      ...overrides,
    };
  }

  it('parses email and returns an EmployeeSubmission with recipientEmail', async () => {
    mockS3Response('raw mime content');
    mockSimpleParser.mockResolvedValue(makeParsedEmail());
    mockNormalizeBatch.mockReturnValue(
      new Map([['passport.pdf', 'john_doe_passport.pdf']])
    );

    const result = await parseEmailFromS3('test-bucket', 'incoming/abc');

    expect(result.messageId).toBe('<msg-123@test.com>');
    expect(result.recipientEmail).toBe('onboarding@company.com');
    expect(result.employeeName).toBe('John Doe');
    expect(result.employeeEmail).toBe('john@example.com');
    expect(result.subject).toBe('My Onboarding Documents');
    expect(result.attachments).toHaveLength(1);
    expect(result.attachments[0].originalName).toBe('passport.pdf');
    expect(result.attachments[0].normalizedName).toBe('john_doe_passport.pdf');
    expect(result.attachments[0].contentType).toBe('application/pdf');
    expect(result.attachments[0].contentBytes).toBe(
      Buffer.from('pdf-content-1').toString('base64')
    );
  });

  it('extracts recipient email from "to" field', async () => {
    mockS3Response('raw email');
    mockSimpleParser.mockResolvedValue(
      makeParsedEmail({
        to: { value: [{ address: 'docs@acme.com' }] },
      })
    );
    mockNormalizeBatch.mockReturnValue(
      new Map([['passport.pdf', 'john_doe_passport.pdf']])
    );

    const result = await parseEmailFromS3('bucket', 'key');
    expect(result.recipientEmail).toBe('docs@acme.com');
  });

  it('returns empty recipientEmail when "to" is missing', async () => {
    mockS3Response('raw email');
    mockSimpleParser.mockResolvedValue(
      makeParsedEmail({ to: undefined })
    );
    mockNormalizeBatch.mockReturnValue(
      new Map([['passport.pdf', 'john_doe_passport.pdf']])
    );

    const result = await parseEmailFromS3('bucket', 'key');
    expect(result.recipientEmail).toBe('');
  });

  it('extracts employee name from email address when display name is absent', async () => {
    mockS3Response('raw email');
    mockSimpleParser.mockResolvedValue(
      makeParsedEmail({
        from: {
          value: [{ name: undefined, address: 'jane.smith@example.com' }],
        },
      })
    );
    mockNormalizeBatch.mockReturnValue(
      new Map([['passport.pdf', 'jane_smith_passport.pdf']])
    );

    const result = await parseEmailFromS3('bucket', 'key');

    expect(result.employeeName).toBe('Jane Smith');
  });

  it('extracts name from email with underscores and hyphens', async () => {
    mockS3Response('raw email');
    mockSimpleParser.mockResolvedValue(
      makeParsedEmail({
        from: {
          value: [{ name: '', address: 'first_last-name@test.com' }],
        },
      })
    );
    mockNormalizeBatch.mockReturnValue(new Map([['passport.pdf', 'norm.pdf']]));

    const result = await parseEmailFromS3('bucket', 'key');

    expect(result.employeeName).toBe('First Last Name');
  });

  it('returns "Unknown" when both name and address are missing', async () => {
    mockS3Response('raw email');
    mockSimpleParser.mockResolvedValue(
      makeParsedEmail({
        from: {
          value: [{ name: undefined, address: undefined }],
        },
      })
    );
    mockNormalizeBatch.mockReturnValue(new Map([['passport.pdf', 'norm.pdf']]));

    const result = await parseEmailFromS3('bucket', 'key');

    expect(result.employeeName).toBe('Unknown');
  });

  it('throws when sender cannot be extracted', async () => {
    mockS3Response('raw email');
    mockSimpleParser.mockResolvedValue(
      makeParsedEmail({ from: undefined })
    );

    await expect(parseEmailFromS3('bucket', 'key')).rejects.toThrow(
      'Could not extract sender from email at s3://bucket/key'
    );
  });

  it('throws when there are no PDF attachments', async () => {
    mockS3Response('raw email');
    mockSimpleParser.mockResolvedValue(
      makeParsedEmail({
        attachments: [
          {
            filename: 'image.png',
            contentType: 'image/png',
            content: Buffer.from('png'),
            size: 512,
          },
        ],
      })
    );

    await expect(parseEmailFromS3('bucket', 'key')).rejects.toThrow(
      'No PDF attachments found in email from john@example.com'
    );
  });

  it('throws when there are no attachments at all', async () => {
    mockS3Response('raw email');
    mockSimpleParser.mockResolvedValue(
      makeParsedEmail({ attachments: [] })
    );

    await expect(parseEmailFromS3('bucket', 'key')).rejects.toThrow(
      'No PDF attachments found'
    );
  });

  it('handles multiple PDF attachments', async () => {
    mockS3Response('raw email');
    mockSimpleParser.mockResolvedValue(
      makeParsedEmail({
        attachments: [
          {
            filename: 'passport.pdf',
            contentType: 'application/pdf',
            content: Buffer.from('pdf1'),
            size: 100,
          },
          {
            filename: 'dl.pdf',
            contentType: 'application/pdf',
            content: Buffer.from('pdf2'),
            size: 200,
          },
        ],
      })
    );
    mockNormalizeBatch.mockReturnValue(
      new Map([
        ['passport.pdf', 'john_doe_passport.pdf'],
        ['dl.pdf', 'john_doe_driving_license.pdf'],
      ])
    );

    const result = await parseEmailFromS3('bucket', 'key');

    expect(result.attachments).toHaveLength(2);
    expect(result.attachments[0].normalizedName).toBe('john_doe_passport.pdf');
    expect(result.attachments[1].normalizedName).toBe('john_doe_driving_license.pdf');
  });

  it('detects PDFs by file extension when contentType is not application/pdf', async () => {
    mockS3Response('raw email');
    mockSimpleParser.mockResolvedValue(
      makeParsedEmail({
        attachments: [
          {
            filename: 'document.PDF',
            contentType: 'application/octet-stream',
            content: Buffer.from('pdf-data'),
            size: 300,
          },
        ],
      })
    );
    mockNormalizeBatch.mockReturnValue(
      new Map([['document.PDF', 'john_doe_document.pdf']])
    );

    const result = await parseEmailFromS3('bucket', 'key');
    expect(result.attachments).toHaveLength(1);
  });

  it('uses key as messageId when parsed messageId is missing', async () => {
    mockS3Response('raw email');
    mockSimpleParser.mockResolvedValue(
      makeParsedEmail({ messageId: undefined })
    );
    mockNormalizeBatch.mockReturnValue(new Map([['passport.pdf', 'norm.pdf']]));

    const result = await parseEmailFromS3('bucket', 'my-key');
    expect(result.messageId).toBe('my-key');
  });

  it('uses empty subject when parsed subject is missing', async () => {
    mockS3Response('raw email');
    mockSimpleParser.mockResolvedValue(
      makeParsedEmail({ subject: undefined })
    );
    mockNormalizeBatch.mockReturnValue(new Map([['passport.pdf', 'norm.pdf']]));

    const result = await parseEmailFromS3('bucket', 'key');
    expect(result.subject).toBe('');
  });

  it('handles attachment without filename', async () => {
    mockS3Response('raw email');
    mockSimpleParser.mockResolvedValue(
      makeParsedEmail({
        attachments: [
          {
            filename: undefined,
            contentType: 'application/pdf',
            content: Buffer.from('pdf-data'),
            size: 100,
          },
        ],
      })
    );
    mockNormalizeBatch.mockReturnValue(
      new Map([['unnamed.pdf', 'john_doe_document.pdf']])
    );

    const result = await parseEmailFromS3('bucket', 'key');
    expect(result.attachments[0].originalName).toBe('unnamed.pdf');
  });

  it('uses current date when parsed date is missing', async () => {
    mockS3Response('raw email');
    const now = new Date();
    mockSimpleParser.mockResolvedValue(
      makeParsedEmail({ date: undefined })
    );
    mockNormalizeBatch.mockReturnValue(new Map([['passport.pdf', 'norm.pdf']]));

    const result = await parseEmailFromS3('bucket', 'key');
    const receivedAt = new Date(result.receivedAt);
    expect(receivedAt.getTime()).toBeGreaterThanOrEqual(now.getTime() - 1000);
  });

  it('keeps original name when normalizer does not map it', async () => {
    mockS3Response('raw email');
    mockSimpleParser.mockResolvedValue(makeParsedEmail());
    mockNormalizeBatch.mockReturnValue(new Map()); // no mappings

    const result = await parseEmailFromS3('bucket', 'key');
    expect(result.attachments[0].normalizedName).toBe('passport.pdf');
  });
});
