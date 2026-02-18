import { Router } from 'express';
import { processEmailFromS3 } from '../services/processing.service';
import { config } from '../config';

const router = Router();

/**
 * POST /trigger — manually triggers processing for a specific email in S3.
 * Only available in development; useful for testing without SES delivery.
 *
 * Body: { "key": "incoming/abc123" }
 */
router.post('/trigger', async (req, res) => {
  const { key } = req.body as { key?: string };
  if (!key) {
    res.status(400).json({ error: 'Request body must include "key" (S3 object key)' });
    return;
  }

  try {
    const result = await processEmailFromS3(config.aws.emailBucket, key);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Manual trigger failed:', message);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
