import { Router, Request, Response } from 'express';
import { MergeRequest } from '../types';
import { startMergeJob, getJob, getAllJobs } from '../services/merge-orchestrator';

const router = Router();

/**
 * POST /api/merge
 * Start a new video merge job.
 *
 * Body: { bucket, chunkPrefix, outputKey }
 */
router.post('/', (req: Request, res: Response): void => {
  const { bucket, chunkPrefix, outputKey } = req.body as Partial<MergeRequest>;

  if (!bucket || !chunkPrefix || !outputKey) {
    res.status(400).json({
      error: 'Missing required fields: bucket, chunkPrefix, outputKey',
    });
    return;
  }

  const jobId = startMergeJob({ bucket, chunkPrefix, outputKey });

  res.status(202).json({
    jobId,
    message: 'Merge job started',
    statusUrl: `/api/merge/${jobId}`,
  });
});

/**
 * GET /api/merge
 * List all merge jobs.
 */
router.get('/', (_req: Request, res: Response): void => {
  const jobs = getAllJobs();
  res.json({ jobs });
});

/**
 * GET /api/merge/:jobId
 * Get status of a specific merge job.
 */
router.get('/:jobId', (req: Request<{ jobId: string }>, res: Response): void => {
  const job = getJob(req.params.jobId);

  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  res.json({ job });
});

export default router;
