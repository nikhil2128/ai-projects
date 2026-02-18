import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SQSEvent } from '../types';

vi.mock('../config', () => ({
  config: {
    aws: { region: 'us-east-1', dynamoTable: 'tbl', emailBucket: 'bkt' },
    azure: { tenantId: 't', clientId: 'c', clientSecret: 's' },
    hr: { email: 'hr@t.com', userId: 'u' },
    onedrive: { rootFolder: 'D' },
    ses: { fromEmail: 'n@t.com' },
  },
}));

const mockProcessEmailFromS3 = vi.hoisted(() => vi.fn());
vi.mock('../services/processing.service', () => ({
  processEmailFromS3: mockProcessEmailFromS3,
}));

import { handler } from '../handlers/process-emails.handler';

function makeSQSRecord(
  sqsMessageId: string,
  bucket: string,
  key: string,
  receiveCount = 1
) {
  return {
    messageId: sqsMessageId,
    receiptHandle: `handle-${sqsMessageId}`,
    body: JSON.stringify({
      Records: [{ s3: { bucket: { name: bucket }, object: { key } } }],
    }),
    attributes: {
      ApproximateReceiveCount: String(receiveCount),
      SentTimestamp: '1234567890',
      SenderId: 'sender',
      ApproximateFirstReceiveTimestamp: '1234567890',
    },
    messageAttributes: {},
    md5OfBody: '',
    eventSource: 'aws:sqs',
    eventSourceARN: 'arn:aws:sqs:us-east-1:123456789:queue',
    awsRegion: 'us-east-1',
  };
}

describe('process-emails handler (SQS)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('processes a single SQS record and returns no failures', async () => {
    mockProcessEmailFromS3.mockResolvedValue({
      success: true,
      messageId: 'msg-1',
      employeeName: 'John',
    });

    const event: SQSEvent = {
      Records: [makeSQSRecord('sqs-1', 'my-bucket', 'incoming/001')],
    };

    const response = await handler(event);

    expect(response.batchItemFailures).toEqual([]);
    expect(mockProcessEmailFromS3).toHaveBeenCalledWith('my-bucket', 'incoming/001');
  });

  it('processes multiple records successfully', async () => {
    mockProcessEmailFromS3
      .mockResolvedValueOnce({ success: true, messageId: 'msg-1' })
      .mockResolvedValueOnce({ success: true, messageId: 'msg-2' })
      .mockResolvedValueOnce({ success: true, messageId: 'msg-3' });

    const event: SQSEvent = {
      Records: [
        makeSQSRecord('sqs-1', 'b', 'k1'),
        makeSQSRecord('sqs-2', 'b', 'k2'),
        makeSQSRecord('sqs-3', 'b', 'k3'),
      ],
    };

    const response = await handler(event);
    expect(response.batchItemFailures).toEqual([]);
  });

  it('reports only failed records in batchItemFailures', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockProcessEmailFromS3
      .mockResolvedValueOnce({ success: true, messageId: 'msg-1' })
      .mockResolvedValueOnce({ success: false, messageId: 'msg-2', error: 'fail' });

    const event: SQSEvent = {
      Records: [
        makeSQSRecord('sqs-1', 'b', 'k1'),
        makeSQSRecord('sqs-2', 'b', 'k2'),
      ],
    };

    const response = await handler(event);

    expect(response.batchItemFailures).toEqual([
      { itemIdentifier: 'sqs-2' },
    ]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('reports all records as failed when all processing fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockProcessEmailFromS3.mockResolvedValue({
      success: false,
      messageId: 'msg-x',
      error: 'boom',
    });

    const event: SQSEvent = {
      Records: [
        makeSQSRecord('sqs-1', 'b', 'k1'),
        makeSQSRecord('sqs-2', 'b', 'k2'),
      ],
    };

    const response = await handler(event);

    expect(response.batchItemFailures).toHaveLength(2);
    expect(response.batchItemFailures).toEqual([
      { itemIdentifier: 'sqs-1' },
      { itemIdentifier: 'sqs-2' },
    ]);
    consoleSpy.mockRestore();
  });

  it('catches thrown errors and reports them as batch failures', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockProcessEmailFromS3.mockRejectedValue(new Error('unexpected crash'));

    const event: SQSEvent = {
      Records: [makeSQSRecord('sqs-1', 'b', 'k1')],
    };

    const response = await handler(event);

    expect(response.batchItemFailures).toEqual([
      { itemIdentifier: 'sqs-1' },
    ]);
    consoleSpy.mockRestore();
  });

  it('logs a warning on retry attempts', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockProcessEmailFromS3.mockResolvedValue({
      success: true,
      messageId: 'msg-1',
    });

    const event: SQSEvent = {
      Records: [makeSQSRecord('sqs-1', 'b', 'k1', 3)],
    };

    await handler(event);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Retry attempt 3')
    );
    warnSpy.mockRestore();
  });
});
