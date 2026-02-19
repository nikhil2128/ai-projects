import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../config', () => ({
  config: {
    aws: { region: 'us-east-1', dynamoTable: 'tbl', tenantsTable: 'tenants', emailBucket: 'test-email-bucket' },
    processing: { retryMaxAttempts: 1, retryBaseDelayMs: 10, retryMaxDelayMs: 100 },
  },
}));

const mockProcessEmailFromS3 = vi.hoisted(() => vi.fn());
vi.mock('../services/processing.service', () => ({
  processEmailFromS3: mockProcessEmailFromS3,
}));

import triggerRouter from '../routes/trigger';

const app = express();
app.use(express.json());
app.use(triggerRouter);

describe('POST /trigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when key is not provided', async () => {
    const res = await request(app).post('/trigger').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('key');
  });

  it('processes the email and returns the result', async () => {
    mockProcessEmailFromS3.mockResolvedValue({
      success: true,
      messageId: 'msg-1',
      tenantId: 'tenant-001',
      employeeName: 'Alice',
      folderUrl: 'https://share/link',
      documentsUploaded: ['alice_passport.pdf'],
    });

    const res = await request(app)
      .post('/trigger')
      .send({ key: 'incoming/test-email' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.employeeName).toBe('Alice');
    expect(res.body.tenantId).toBe('tenant-001');
    expect(mockProcessEmailFromS3).toHaveBeenCalledWith(
      'test-email-bucket',
      'incoming/test-email'
    );
  });

  it('returns 500 when processing fails with Error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockProcessEmailFromS3.mockRejectedValue(new Error('S3 timeout'));

    const res = await request(app)
      .post('/trigger')
      .send({ key: 'incoming/bad' });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('S3 timeout');
    consoleSpy.mockRestore();
  });

  it('returns 500 when processing fails with non-Error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockProcessEmailFromS3.mockRejectedValue('unexpected failure');

    const res = await request(app)
      .post('/trigger')
      .send({ key: 'incoming/bad' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('unexpected failure');
    consoleSpy.mockRestore();
  });
});
