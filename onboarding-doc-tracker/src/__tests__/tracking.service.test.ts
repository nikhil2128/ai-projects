import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config', () => ({
  config: {
    aws: { region: 'us-east-1', dynamoTable: 'test-tracking-table' },
    processing: {
      retryMaxAttempts: 3,
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
  getProcessedMessageIds,
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
      expect(command.ConditionExpression).toBe(
        'attribute_not_exists(messageId) OR #s = :failed'
      );
      expect(command.ExpressionAttributeNames).toEqual({ '#s': 'status' });
      expect(command.ExpressionAttributeValues).toEqual({ ':failed': 'failed' });
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

  describe('getProcessedMessageIds', () => {
    it('returns empty set for empty input', async () => {
      const result = await getProcessedMessageIds([]);
      expect(result).toEqual(new Set());
      expect(mockDocClientSend).not.toHaveBeenCalled();
    });

    it('returns set of found message IDs', async () => {
      mockDocClientSend.mockResolvedValue({
        Responses: {
          'test-tracking-table': [
            { messageId: 'msg-1' },
            { messageId: 'msg-3' },
          ],
        },
      });

      const result = await getProcessedMessageIds([
        'msg-1',
        'msg-2',
        'msg-3',
      ]);

      expect(result).toEqual(new Set(['msg-1', 'msg-3']));
    });

    it('handles missing Responses gracefully', async () => {
      mockDocClientSend.mockResolvedValue({
        Responses: {},
      });

      const result = await getProcessedMessageIds(['msg-1']);
      expect(result).toEqual(new Set());
    });

    it('handles undefined table responses', async () => {
      mockDocClientSend.mockResolvedValue({
        Responses: {
          'test-tracking-table': undefined,
        },
      });

      const result = await getProcessedMessageIds(['msg-1']);
      expect(result).toEqual(new Set());
    });

    it('chunks requests for more than 100 IDs', async () => {
      const ids = Array.from({ length: 150 }, (_, i) => `msg-${i}`);

      mockDocClientSend
        .mockResolvedValueOnce({
          Responses: {
            'test-tracking-table': [{ messageId: 'msg-0' }],
          },
        })
        .mockResolvedValueOnce({
          Responses: {
            'test-tracking-table': [{ messageId: 'msg-100' }],
          },
        });

      const result = await getProcessedMessageIds(ids);

      expect(mockDocClientSend).toHaveBeenCalledTimes(2);
      expect(result).toEqual(new Set(['msg-0', 'msg-100']));

      // Verify first chunk has 100 keys
      const firstCommand = mockDocClientSend.mock.calls[0][0];
      expect(
        firstCommand.RequestItems['test-tracking-table'].Keys
      ).toHaveLength(100);

      // Verify second chunk has 50 keys
      const secondCommand = mockDocClientSend.mock.calls[1][0];
      expect(
        secondCommand.RequestItems['test-tracking-table'].Keys
      ).toHaveLength(50);
    });
  });

  describe('isAlreadyProcessed', () => {
    it('returns true when status is processed', async () => {
      mockDocClientSend.mockResolvedValue({
        Item: { status: 'processed' },
      });

      const result = await isAlreadyProcessed('existing-msg');
      expect(result).toBe(true);

      const command = mockDocClientSend.mock.calls[0][0];
      expect(command._type).toBe('GetCommand');
      expect(command.Key).toEqual({ messageId: 'existing-msg' });
    });

    it('returns false when status is failed (allows retry)', async () => {
      mockDocClientSend.mockResolvedValue({
        Item: { status: 'failed' },
      });

      const result = await isAlreadyProcessed('failed-msg');
      expect(result).toBe(false);
    });

    it('returns false when the message does not exist', async () => {
      mockDocClientSend.mockResolvedValue({});

      const result = await isAlreadyProcessed('new-msg');
      expect(result).toBe(false);
    });
  });

  describe('recordFailure', () => {
    it('saves a failure record with error details', async () => {
      await recordFailure('msg-fail', 'John', 'john@test.com', 'Parse error');

      expect(mockDocClientSend).toHaveBeenCalledOnce();
      const command = mockDocClientSend.mock.calls[0][0];
      expect(command.Item.messageId).toBe('msg-fail');
      expect(command.Item.status).toBe('failed');
      expect(command.Item.error).toBe('Parse error');
      expect(command.Item.employeeName).toBe('John');
      expect(command.Item.employeeEmail).toBe('john@test.com');
    });

    it('swallows DynamoDB errors and logs them', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockDocClientSend.mockRejectedValue(new Error('DDB error'));

      // Should not throw
      await recordFailure('msg-x', '', '', 'some error');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to record failure in DynamoDB:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });
});
