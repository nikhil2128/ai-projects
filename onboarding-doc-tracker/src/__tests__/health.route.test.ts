import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../config', () => ({
  config: {
    aws: { region: 'us-east-1', dynamoTable: 'tbl', emailBucket: 'bkt' },
    azure: { tenantId: 't', clientId: 'c', clientSecret: 's' },
    hr: { email: 'hr@t.com', userId: 'u' },
    onedrive: { rootFolder: 'D' },
    ses: { fromEmail: 'n@t.com' },
  },
}));

import healthRouter from '../routes/health';

const app = express();
app.use(healthRouter);

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('onboarding-doc-tracker');
    expect(res.body.timestamp).toBeDefined();
  });

  it('returns a valid ISO timestamp', async () => {
    const res = await request(app).get('/health');
    const timestamp = new Date(res.body.timestamp);
    expect(timestamp.toISOString()).toBe(res.body.timestamp);
  });
});
