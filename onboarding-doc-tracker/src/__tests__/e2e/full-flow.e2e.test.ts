import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../config', () => ({
  config: {
    port: 3099,
    nodeEnv: 'test',
    azure: { tenantId: 'e2e-tenant', clientId: 'e2e-client', clientSecret: 'e2e-secret' },
    hr: { email: 'hr@e2e.com', userId: 'e2e-user-id' },
    onedrive: { rootFolder: 'E2E Onboarding' },
    aws: { region: 'us-east-1', dynamoTable: 'e2e-table', emailBucket: 'e2e-bucket' },
    ses: { fromEmail: 'e2e@test.com' },
  },
}));

// --- S3 mock ---
const mockS3Send = vi.hoisted(() => vi.fn());
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({ send: mockS3Send })),
  GetObjectCommand: vi.fn((input: unknown) => input),
}));

// --- SES mock ---
const mockSESSend = vi.hoisted(() => vi.fn());
vi.mock('@aws-sdk/client-ses', () => ({
  SESClient: vi.fn(() => ({ send: mockSESSend })),
  SendEmailCommand: vi.fn((input: unknown) => input),
}));

// --- DynamoDB mock ---
const mockDDBSend = vi.hoisted(() => vi.fn());
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(() => ({})),
}));
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({ send: mockDDBSend })),
  },
  PutCommand: vi.fn((input: unknown) => input),
  BatchGetCommand: vi.fn((input: unknown) => input),
}));

// --- mailparser mock ---
const mockSimpleParser = vi.hoisted(() => vi.fn());
vi.mock('mailparser', () => ({
  simpleParser: mockSimpleParser,
}));

// --- Graph API mock (via global fetch) ---
const mockFetch = vi.hoisted(() => vi.fn());
vi.stubGlobal('fetch', mockFetch);

import app from '../../app';

describe('E2E: Full onboarding document flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupMocks() {
    // S3 returns raw email
    mockS3Send.mockResolvedValue({
      Body: {
        transformToString: vi.fn().mockResolvedValue('raw MIME email'),
      },
    });

    // mailparser returns a parsed email with sender and attachments
    mockSimpleParser.mockResolvedValue({
      messageId: '<e2e-msg-001@test.com>',
      from: {
        value: [{ name: 'Sarah Connor', address: 'sarah@example.com' }],
      },
      subject: 'Onboarding - Sarah Connor Documents',
      date: new Date('2024-06-15T14:30:00Z'),
      attachments: [
        {
          filename: 'passport_scan.pdf',
          contentType: 'application/pdf',
          content: Buffer.from('fake-passport-pdf'),
          size: 2048,
        },
        {
          filename: 'driving_license.pdf',
          contentType: 'application/pdf',
          content: Buffer.from('fake-dl-pdf'),
          size: 1536,
        },
      ],
    });

    // DynamoDB: message not yet processed
    mockDDBSend.mockResolvedValueOnce({
      Responses: { 'e2e-table': [] },
    });
    // DynamoDB: save record succeeds
    mockDDBSend.mockResolvedValueOnce({});

    // Graph API: token acquisition
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'e2e-token',
        token_type: 'Bearer',
        expires_in: 3600,
      }),
    });
    // Graph API: find root folder → not found
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ value: [] }),
    });
    // Graph API: create root folder
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'root-folder-id',
        name: 'E2E Onboarding',
        folder: { childCount: 0 },
      }),
    });
    // Graph API: find employee folder → not found
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ value: [] }),
    });
    // Graph API: create employee folder
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'sarah-folder-id',
        name: 'Sarah Connor',
        folder: { childCount: 0 },
      }),
    });
    // Graph API: upload document 1
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'file-1',
        name: 'sarah_connor_passport.pdf',
        webUrl: 'https://onedrive.com/file-1',
      }),
    });
    // Graph API: upload document 2
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'file-2',
        name: 'sarah_connor_driving_license.pdf',
        webUrl: 'https://onedrive.com/file-2',
      }),
    });
    // Graph API: create sharing link
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'share-link-id',
        link: {
          webUrl: 'https://sharepoint.com/share/sarah-connor-docs',
          type: 'view',
          scope: 'organization',
        },
      }),
    });

    // SES: send notification succeeds
    mockSESSend.mockResolvedValue({});
  }

  it('processes an email through the entire pipeline via /trigger', async () => {
    setupMocks();

    const res = await request(app)
      .post('/trigger')
      .send({ key: 'incoming/sarah-email-001' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.messageId).toBe('<e2e-msg-001@test.com>');
    expect(res.body.employeeName).toBe('Sarah Connor');
    expect(res.body.folderUrl).toBe('https://sharepoint.com/share/sarah-connor-docs');
    expect(res.body.documentsUploaded).toEqual([
      'sarah_connor_passport.pdf',
      'sarah_connor_driving_license.pdf',
    ]);

    // Verify S3 was called to get the email
    expect(mockS3Send).toHaveBeenCalledOnce();

    // Verify DynamoDB was called (check + save)
    expect(mockDDBSend).toHaveBeenCalledTimes(2);

    // Verify SES was called for HR notification
    expect(mockSESSend).toHaveBeenCalledOnce();
    const sesCommand = mockSESSend.mock.calls[0][0];
    expect(sesCommand.Destination.ToAddresses).toEqual(['hr@e2e.com']);
    expect(sesCommand.Message.Subject.Data).toContain('Sarah Connor');
  });

  it('skips already-processed emails', async () => {
    // S3 returns email
    mockS3Send.mockResolvedValue({
      Body: {
        transformToString: vi.fn().mockResolvedValue('raw email'),
      },
    });

    mockSimpleParser.mockResolvedValue({
      messageId: '<already-processed@test.com>',
      from: { value: [{ name: 'Bob', address: 'bob@test.com' }] },
      subject: 'Docs',
      date: new Date(),
      attachments: [
        {
          filename: 'passport.pdf',
          contentType: 'application/pdf',
          content: Buffer.from('pdf'),
          size: 100,
        },
      ],
    });

    // DynamoDB: message already processed
    mockDDBSend.mockResolvedValueOnce({
      Responses: {
        'e2e-table': [{ messageId: '<already-processed@test.com>' }],
      },
    });

    const res = await request(app)
      .post('/trigger')
      .send({ key: 'incoming/duplicate' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // No Graph API calls (no folder creation, upload, or sharing)
    expect(mockFetch).not.toHaveBeenCalled();
    // No SES notification
    expect(mockSESSend).not.toHaveBeenCalled();
  });

  it('returns error when email has no PDF attachments', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockS3Send.mockResolvedValue({
      Body: {
        transformToString: vi.fn().mockResolvedValue('raw email'),
      },
    });

    mockSimpleParser.mockResolvedValue({
      messageId: '<no-pdfs@test.com>',
      from: { value: [{ name: 'Eve', address: 'eve@test.com' }] },
      subject: 'Hello',
      date: new Date(),
      attachments: [
        {
          filename: 'photo.jpg',
          contentType: 'image/jpeg',
          content: Buffer.from('img'),
          size: 500,
        },
      ],
    });

    // DynamoDB: recordFailure
    mockDDBSend.mockResolvedValue({});

    const res = await request(app)
      .post('/trigger')
      .send({ key: 'incoming/no-pdfs' });

    // processEmailFromS3 catches errors internally and returns {success: false}
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('No PDF attachments');

    consoleSpy.mockRestore();
  });

  it('health endpoint works alongside triggers', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('onboarding-doc-tracker');
  });
});
