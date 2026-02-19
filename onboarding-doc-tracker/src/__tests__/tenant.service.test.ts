import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config', () => ({
  config: {
    aws: { region: 'us-east-1', tenantsTable: 'test-tenants-table' },
    processing: { retryMaxAttempts: 1, retryBaseDelayMs: 10, retryMaxDelayMs: 100 },
  },
}));

const mockDocClientSend = vi.hoisted(() => vi.fn());
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(() => ({})),
}));
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({ send: mockDocClientSend })),
  },
  PutCommand: vi.fn((input: unknown) => ({ _type: 'PutCommand', ...input as object })),
  GetCommand: vi.fn((input: unknown) => ({ _type: 'GetCommand', ...input as object })),
  QueryCommand: vi.fn((input: unknown) => ({ _type: 'QueryCommand', ...input as object })),
  ScanCommand: vi.fn((input: unknown) => ({ _type: 'ScanCommand', ...input as object })),
  DeleteCommand: vi.fn((input: unknown) => ({ _type: 'DeleteCommand', ...input as object })),
}));

vi.mock('crypto', () => ({
  randomUUID: vi.fn(() => 'generated-uuid'),
}));

const mockStoreSecret = vi.hoisted(() => vi.fn().mockResolvedValue('arn:aws:secretsmanager:us-east-1:123:secret:test'));
const mockUpdateSecret = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockDeleteSecret = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('../services/secrets.service', () => ({
  storeSecret: mockStoreSecret,
  updateSecret: mockUpdateSecret,
  deleteSecret: mockDeleteSecret,
}));

vi.mock('../middleware/security', () => ({
  auditLog: vi.fn(),
}));

import {
  createTenant,
  getTenant,
  getTenantByReceivingEmail,
  updateTenant,
  deleteTenant,
  listTenants,
} from '../services/tenant.service';

const sampleInput = {
  companyName: 'Acme Corp',
  receivingEmail: 'onboarding@acme.com',
  hrEmail: 'hr@acme.com',
  hrUserId: 'acme-hr-user-id',
  azureTenantId: 'acme-azure-tenant',
  azureClientId: 'acme-azure-client',
  azureClientSecret: 'acme-azure-secret',
  oneDriveRootFolder: 'Onboarding Docs',
  sesFromEmail: 'noreply@acme.com',
};

describe('tenant.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDocClientSend.mockResolvedValue({});
  });

  describe('createTenant', () => {
    it('creates a new tenant with generated ID, stores secret in SM', async () => {
      // Query for existing tenant by email → none found
      mockDocClientSend.mockResolvedValueOnce({ Items: [] });
      // PutCommand succeeds
      mockDocClientSend.mockResolvedValueOnce({});

      const tenant = await createTenant(sampleInput);

      expect(tenant.tenantId).toBe('generated-uuid');
      expect(tenant.companyName).toBe('Acme Corp');
      expect(tenant.receivingEmail).toBe('onboarding@acme.com');
      expect(tenant.azureClientSecretArn).toBe('arn:aws:secretsmanager:us-east-1:123:secret:test');
      expect(tenant.status).toBe('active');
      expect(tenant.createdAt).toBeDefined();
      expect(tenant.updatedAt).toBeDefined();
      expect(mockStoreSecret).toHaveBeenCalledWith('generated-uuid', 'acme-azure-secret');
    });

    it('rejects duplicate receiving email', async () => {
      mockDocClientSend.mockResolvedValueOnce({
        Items: [{ tenantId: 'existing', receivingEmail: 'onboarding@acme.com' }],
      });

      await expect(createTenant(sampleInput)).rejects.toThrow(
        'already exists'
      );
    });
  });

  describe('getTenant', () => {
    it('returns the tenant when found', async () => {
      mockDocClientSend.mockResolvedValue({
        Item: { tenantId: 'tid', companyName: 'Test' },
      });

      const tenant = await getTenant('tid');
      expect(tenant).toEqual({ tenantId: 'tid', companyName: 'Test' });
    });

    it('returns null when not found', async () => {
      mockDocClientSend.mockResolvedValue({});

      const tenant = await getTenant('nonexistent');
      expect(tenant).toBeNull();
    });
  });

  describe('getTenantByReceivingEmail', () => {
    it('queries GSI and returns matching tenant', async () => {
      mockDocClientSend.mockResolvedValue({
        Items: [{ tenantId: 'tid', receivingEmail: 'docs@acme.com' }],
      });

      const tenant = await getTenantByReceivingEmail('docs@acme.com');
      expect(tenant).toEqual({ tenantId: 'tid', receivingEmail: 'docs@acme.com' });

      const command = mockDocClientSend.mock.calls[0][0];
      expect(command.IndexName).toBe('receivingEmail-index');
    });

    it('returns null when no match', async () => {
      mockDocClientSend.mockResolvedValue({ Items: [] });

      const tenant = await getTenantByReceivingEmail('unknown@x.com');
      expect(tenant).toBeNull();
    });
  });

  describe('updateTenant', () => {
    it('updates existing tenant fields', async () => {
      // GetCommand returns existing
      mockDocClientSend.mockResolvedValueOnce({
        Item: {
          tenantId: 'tid',
          companyName: 'Old Name',
          receivingEmail: 'old@x.com',
          azureClientSecretArn: 'arn:test',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      });
      // PutCommand succeeds
      mockDocClientSend.mockResolvedValueOnce({});

      const updated = await updateTenant('tid', { companyName: 'New Name' });

      expect(updated?.companyName).toBe('New Name');
      expect(updated?.createdAt).toBe('2024-01-01T00:00:00.000Z');
    });

    it('returns null for non-existent tenant', async () => {
      mockDocClientSend.mockResolvedValueOnce({});

      const result = await updateTenant('nonexistent', { companyName: 'X' });
      expect(result).toBeNull();
    });

    it('rejects update that would create duplicate receiving email', async () => {
      // GetCommand returns existing
      mockDocClientSend.mockResolvedValueOnce({
        Item: { tenantId: 'tid', receivingEmail: 'old@x.com' },
      });
      // Query for new email → conflict found
      mockDocClientSend.mockResolvedValueOnce({
        Items: [{ tenantId: 'other', receivingEmail: 'taken@x.com' }],
      });

      await expect(
        updateTenant('tid', { receivingEmail: 'taken@x.com' })
      ).rejects.toThrow('already exists');
    });
  });

  describe('deleteTenant', () => {
    it('deletes existing tenant, removes secret, and returns true', async () => {
      mockDocClientSend.mockResolvedValueOnce({
        Item: { tenantId: 'tid', azureClientSecretArn: 'arn:test' },
      });
      mockDocClientSend.mockResolvedValueOnce({});

      const result = await deleteTenant('tid');
      expect(result).toBe(true);
      expect(mockDeleteSecret).toHaveBeenCalledWith('arn:test');
    });

    it('returns false for non-existent tenant', async () => {
      mockDocClientSend.mockResolvedValueOnce({});

      const result = await deleteTenant('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('listTenants', () => {
    it('returns all tenants', async () => {
      mockDocClientSend.mockResolvedValue({
        Items: [
          { tenantId: 't1', companyName: 'A' },
          { tenantId: 't2', companyName: 'B' },
        ],
      });

      const tenants = await listTenants();
      expect(tenants).toHaveLength(2);
      expect(tenants[0].companyName).toBe('A');
    });

    it('returns empty array when no tenants exist', async () => {
      mockDocClientSend.mockResolvedValue({ Items: [] });

      const tenants = await listTenants();
      expect(tenants).toEqual([]);
    });
  });
});
