import { describe, it, expect, vi, beforeEach } from 'vitest';

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

describe('process-emails handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('processes a single S3 event record and returns 200', async () => {
    mockProcessEmailFromS3.mockResolvedValue({
      success: true,
      messageId: 'msg-1',
      employeeName: 'John',
    });

    const event = {
      Records: [
        { s3: { bucket: { name: 'my-bucket' }, object: { key: 'incoming/001' } } },
      ],
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.total).toBe(1);
    expect(body.succeeded).toBe(1);
    expect(body.failed).toBe(0);
    expect(body.duration).toMatch(/^\d+ms$/);
    expect(mockProcessEmailFromS3).toHaveBeenCalledWith('my-bucket', 'incoming/001');
  });

  it('processes multiple records', async () => {
    mockProcessEmailFromS3
      .mockResolvedValueOnce({ success: true, messageId: 'msg-1' })
      .mockResolvedValueOnce({ success: true, messageId: 'msg-2' })
      .mockResolvedValueOnce({ success: true, messageId: 'msg-3' });

    const event = {
      Records: [
        { s3: { bucket: { name: 'b' }, object: { key: 'k1' } } },
        { s3: { bucket: { name: 'b' }, object: { key: 'k2' } } },
        { s3: { bucket: { name: 'b' }, object: { key: 'k3' } } },
      ],
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(body.total).toBe(3);
    expect(body.succeeded).toBe(3);
    expect(body.failed).toBe(0);
    expect(response.statusCode).toBe(200);
  });

  it('returns 207 when some records fail', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockProcessEmailFromS3
      .mockResolvedValueOnce({ success: true, messageId: 'msg-1' })
      .mockResolvedValueOnce({ success: false, messageId: 'msg-2', error: 'fail' });

    const event = {
      Records: [
        { s3: { bucket: { name: 'b' }, object: { key: 'k1' } } },
        { s3: { bucket: { name: 'b' }, object: { key: 'k2' } } },
      ],
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(207);
    expect(body.succeeded).toBe(1);
    expect(body.failed).toBe(1);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('returns 207 when all records fail', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockProcessEmailFromS3.mockResolvedValue({
      success: false,
      messageId: 'msg-x',
      error: 'boom',
    });

    const event = {
      Records: [
        { s3: { bucket: { name: 'b' }, object: { key: 'k1' } } },
      ],
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(207);
    consoleSpy.mockRestore();
  });

  it('includes results array in response body', async () => {
    mockProcessEmailFromS3.mockResolvedValue({
      success: true,
      messageId: 'msg-1',
      employeeName: 'Alice',
      folderUrl: 'https://link',
      documentsUploaded: ['doc.pdf'],
    });

    const event = {
      Records: [
        { s3: { bucket: { name: 'b' }, object: { key: 'k1' } } },
      ],
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(body.results).toHaveLength(1);
    expect(body.results[0].employeeName).toBe('Alice');
  });
});
