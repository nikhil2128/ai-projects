import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config', () => ({
  config: {
    aws: { region: 'us-east-1', dynamoTable: 'test-tracking-table' },
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
  BatchGetCommand: vi.fn((input: unknown) => ({ _type: 'BatchGetCommand', ...input as object })),
}));

import {
  saveProcessingRecord,
  isAlreadyProcessed,
  recordFailure,
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

  describe('saveProcessingRecord', () => {
    it('puts the record into DynamoDB with condition that allows overwriting failed records', async () => {
      await saveProcessingRecord(sampleRecord);

      expect(mockDocClientSend).toHaveBeenCalledOnce();
      const command = mockDocClientSend.mock.calls[0][0];
      expect(command.TableName).toBe('test-tracking-table');
      expect(command.Item).toEqual(sampleRecord);
      expect(command.Item.tenantId).toBe('tenant-001');
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
    it('returns true when status is processed and tenantId matches', async () => {
      mockDocClientSend.mockResolvedValue({
        Item: { status: 'processed', tenantId: 'tenant-001' },
      });

      const result = await isAlreadyProcessed('existing-msg', 'tenant-001');
      expect(result).toBe(true);

      const command = mockDocClientSend.mock.calls[0][0];
      expect(command._type).toBe('GetCommand');
      expect(command.Key).toEqual({ messageId: 'existing-msg' });
    });

    it('returns false when status is failed (allows retry)', async () => {
      mockDocClientSend.mockResolvedValue({
        Item: { status: 'failed', tenantId: 'tenant-001' },
      });

      const result = await isAlreadyProcessed('failed-msg', 'tenant-001');
      expect(result).toBe(false);
    });

    it('returns false when the message does not exist', async () => {
      mockDocClientSend.mockResolvedValue({});

      const result = await isAlreadyProcessed('new-msg', 'tenant-001');
      expect(result).toBe(false);
    });

    it('returns false and logs security event when tenantId mismatches', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockDocClientSend.mockResolvedValue({
        Item: { status: 'processed', tenantId: 'other-tenant' },
      });

      const result = await isAlreadyProcessed('msg-001', 'tenant-001');
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('cross_tenant_duplicate_check'),
      );
      consoleSpy.mockRestore();
    });
  });

  describe('recordFailure', () => {
    it('saves a failure record with tenantId and error details', async () => {
      await recordFailure('tenant-001', 'msg-fail', 'John', 'john@test.com', 'Parse error');

      expect(mockDocClientSend).toHaveBeenCalledOnce();
      const command = mockDocClientSend.mock.calls[0][0];
      expect(command.Item.tenantId).toBe('tenant-001');
      expect(command.Item.messageId).toBe('msg-fail');
      expect(command.Item.status).toBe('failed');
      expect(command.Item.error).toBe('Parse error');
      expect(command.Item.employeeName).toBe('John');
      expect(command.Item.employeeEmail).toBe('john@test.com');
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
