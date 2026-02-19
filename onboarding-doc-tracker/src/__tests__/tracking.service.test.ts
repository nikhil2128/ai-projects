import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config', () => ({
  config: {
    aws: { region: 'us-east-1', dynamoTablePrefix: 'test-tracking' },
    processing: {
      retryMaxAttempts: 1,
      retryBaseDelayMs: 10,
      retryMaxDelayMs: 100,
    },
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
  ScanCommand: vi.fn((input: unknown) => ({ _type: 'ScanCommand', ...input as object })),
}));

import {
  saveProcessingRecord,
  isAlreadyProcessed,
  recordFailure,
  getTrackingTableName,
  getRecordsByTenant,
} from '../services/tracking.service';
import { TrackingRecord } from '../types';

describe('tracking.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDocClientSend.mockResolvedValue({});
  });

  const sampleRecord: TrackingRecord = {
    tenantId: 'tenant-001',
    messageId: 'msg-001',
    employeeName: 'John Doe',
    employeeEmail: 'john@example.com',
    folderUrl: 'https://onedrive.com/folder',
    documentsUploaded: ['john_doe_passport.pdf'],
    processedAt: '2024-01-15T10:00:00.000Z',
    status: 'processed',
  };

  describe('getTrackingTableName', () => {
    it('derives a tenant-specific table name from the prefix', () => {
      expect(getTrackingTableName('tenant-001')).toBe('test-tracking-tenant-001');
    });
  });

  describe('saveProcessingRecord', () => {
    it('puts the record into the tenant-specific DynamoDB table', async () => {
      await saveProcessingRecord(sampleRecord);

      expect(mockDocClientSend).toHaveBeenCalledOnce();
      const command = mockDocClientSend.mock.calls[0][0];
      expect(command.TableName).toBe('test-tracking-tenant-001');
      expect(command.Item).toEqual(sampleRecord);
      expect(command.ConditionExpression).toBe(
        'attribute_not_exists(messageId) OR #s = :failed'
      );
    });

    it('propagates DynamoDB errors', async () => {
      mockDocClientSend.mockRejectedValue(
        new Error('ConditionalCheckFailedException')
      );

      await expect(saveProcessingRecord(sampleRecord)).rejects.toThrow(
        'ConditionalCheckFailedException'
      );
    });
  });

  describe('isAlreadyProcessed', () => {
    it('returns true when status is processed', async () => {
      mockDocClientSend.mockResolvedValue({
        Item: { status: 'processed' },
      });

      const result = await isAlreadyProcessed('existing-msg', 'tenant-001');
      expect(result).toBe(true);

      const command = mockDocClientSend.mock.calls[0][0];
      expect(command._type).toBe('GetCommand');
      expect(command.TableName).toBe('test-tracking-tenant-001');
      expect(command.Key).toEqual({ messageId: 'existing-msg' });
    });

    it('returns false when status is failed (allows retry)', async () => {
      mockDocClientSend.mockResolvedValue({
        Item: { status: 'failed' },
      });

      const result = await isAlreadyProcessed('failed-msg', 'tenant-001');
      expect(result).toBe(false);
    });

    it('returns false when the message does not exist', async () => {
      mockDocClientSend.mockResolvedValue({});

      const result = await isAlreadyProcessed('new-msg', 'tenant-001');
      expect(result).toBe(false);
    });
  });

  describe('getRecordsByTenant', () => {
    it('scans the tenant-specific table', async () => {
      mockDocClientSend.mockResolvedValue({
        Items: [sampleRecord],
      });

      const records = await getRecordsByTenant('tenant-001');

      expect(records).toEqual([sampleRecord]);
      const command = mockDocClientSend.mock.calls[0][0];
      expect(command._type).toBe('ScanCommand');
      expect(command.TableName).toBe('test-tracking-tenant-001');
    });
  });

  describe('recordFailure', () => {
    it('saves a failure record to the tenant-specific table', async () => {
      await recordFailure('tenant-001', 'msg-fail', 'John', 'john@test.com', 'Parse error');

      expect(mockDocClientSend).toHaveBeenCalledOnce();
      const command = mockDocClientSend.mock.calls[0][0];
      expect(command.TableName).toBe('test-tracking-tenant-001');
      expect(command.Item.tenantId).toBe('tenant-001');
      expect(command.Item.messageId).toBe('msg-fail');
      expect(command.Item.status).toBe('failed');
      expect(command.Item.error).toBe('Parse error');
      expect(command.Item.employeeName).toBe('John');
      expect(command.Item.employeeEmail).toBe('john@test.com');
    });

    it('skips recording when tenantId is unknown', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await recordFailure('unknown', 'msg-x', '', '', 'some error');

      expect(mockDocClientSend).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('failure_not_tracked'),
      );
      consoleSpy.mockRestore();
    });

    it('swallows DynamoDB errors and logs them', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockDocClientSend.mockRejectedValue(new Error('DDB error'));

      await recordFailure('tenant-001', 'msg-x', '', '', 'some error');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to record failure in DynamoDB:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });
});
