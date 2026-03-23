import { Router } from 'express';
import { processEmailFromS3 } from '../services/processing.service';
import { config } from '../config';
import { requireApiKey, auditLog, sanitizeErrorMessage } from '../middleware/security';

const router = Router();

router.use('/trigger', requireApiKey);

/**
 * POST /trigger — manually triggers processing for a specific email in S3.
 * Protected by API key even in development.
 *
 * Body: { "key": "incoming/abc123" }
 */
router.post('/trigger', async (req, res) => {
  const { key } = req.body as { key?: string };
  if (!key) {
    res.status(400).json({ error: 'Request body must include "key" (S3 object key)' });
    return;
  }

  if (!key.startsWith('incoming/')) {
    res.status(400).json({ error: 'S3 key must start with "incoming/"' });
    return;
  }

  auditLog('api.trigger', { key }, req);

  try {
    const result = await processEmailFromS3(config.aws.emailBucket, key);
    res.json(result);
  } catch (error) {
    console.error('Manual trigger failed:', error);
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) });
  }
});

export default router;
