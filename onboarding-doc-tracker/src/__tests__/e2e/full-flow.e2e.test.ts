import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { Tenant } from '../../types';

vi.mock('../../config', () => ({
  config: {
    port: 3099,
    nodeEnv: 'test',
    aws: { region: 'us-east-1', dynamoTable: 'e2e-table', tenantsTable: 'e2e-tenants', emailBucket: 'e2e-bucket' },
    apiKey: '',
    processing: {
      emailConcurrency: 5,
      uploadConcurrency: 3,
      retryMaxAttempts: 1,
      retryBaseDelayMs: 10,
      retryMaxDelayMs: 100,
    },
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
  GetCommand: vi.fn((input: unknown) => input),
  BatchGetCommand: vi.fn((input: unknown) => input),
  QueryCommand: vi.fn((input: unknown) => input),
  ScanCommand: vi.fn((input: unknown) => input),
  DeleteCommand: vi.fn((input: unknown) => input),
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

const testTenant: Tenant = {
  tenantId: 'e2e-tenant-id',
  companyName: 'E2E Corp',
  receivingEmail: 'onboarding@e2ecorp.com',
  hrEmail: 'hr@e2ecorp.com',
  hrUserId: 'e2e-user-id',
  azureTenantId: 'e2e-azure-tenant',
  azureClientId: 'e2e-azure-client',
  azureClientSecret: 'e2e-azure-secret',
  oneDriveRootFolder: 'E2E Onboarding',
  sesFromEmail: 'e2e@test.com',
  status: 'active',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

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

    // mailparser returns a parsed email with sender, recipient, and attachments
    mockSimpleParser.mockResolvedValue({
      messageId: '<e2e-msg-001@test.com>',
      from: {
        value: [{ name: 'Sarah Connor', address: 'sarah@example.com' }],
      },
      to: {
        value: [{ address: 'onboarding@e2ecorp.com' }],
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

    // DynamoDB: tenant lookup by receiving email (QueryCommand on tenants table)
    mockDDBSend.mockResolvedValueOnce({
      Items: [testTenant],
    });
    // DynamoDB: isAlreadyProcessed check
    mockDDBSend.mockResolvedValueOnce({});
    // DynamoDB: save processing record
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

  it('processes an email through the entire multi-tenant pipeline via /trigger', async () => {
    setupMocks();

    const res = await request(app)
      .post('/trigger')
      .send({ key: 'incoming/sarah-email-001' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.messageId).toBe('<e2e-msg-001@test.com>');
    expect(res.body.tenantId).toBe('e2e-tenant-id');
    expect(res.body.employeeName).toBe('Sarah Connor');
    expect(res.body.folderUrl).toBe('https://sharepoint.com/share/sarah-connor-docs');
    expect(res.body.documentsUploaded).toEqual([
      'sarah_connor_passport.pdf',
      'sarah_connor_driving_license.pdf',
    ]);

    // Verify S3 was called to get the email
    expect(mockS3Send).toHaveBeenCalledOnce();

    // Verify SES used tenant's config
    expect(mockSESSend).toHaveBeenCalledOnce();
    const sesCommand = mockSESSend.mock.calls[0][0];
    expect(sesCommand.Source).toBe('e2e@test.com');
    expect(sesCommand.Destination.ToAddresses).toEqual(['hr@e2ecorp.com']);
    expect(sesCommand.Message.Subject.Data).toContain('Sarah Connor');
  });

  it('fails when no tenant matches the recipient email', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockS3Send.mockResolvedValue({
      Body: {
        transformToString: vi.fn().mockResolvedValue('raw email'),
      },
    });

    mockSimpleParser.mockResolvedValue({
      messageId: '<unknown@test.com>',
      from: { value: [{ name: 'Bob', address: 'bob@test.com' }] },
      to: { value: [{ address: 'unknown@nowhere.com' }] },
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

    // Tenant lookup returns no match
    mockDDBSend.mockResolvedValueOnce({ Items: [] });
    // recordFailure
    mockDDBSend.mockResolvedValueOnce({});

    const res = await request(app)
      .post('/trigger')
      .send({ key: 'incoming/unknown-tenant' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('No tenant registered');

    consoleSpy.mockRestore();
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
      to: { value: [{ address: 'onboarding@e2ecorp.com' }] },
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

    // recordFailure
    mockDDBSend.mockResolvedValue({});

    const res = await request(app)
      .post('/trigger')
      .send({ key: 'incoming/no-pdfs' });

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
