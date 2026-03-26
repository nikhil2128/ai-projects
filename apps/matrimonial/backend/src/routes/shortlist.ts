import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { store } from '../data/store.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticateToken);

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const entries = await store.getShortlist(userId);

  const enriched = await Promise.all(entries.map(async (entry) => ({
    ...entry,
    profile: (await store.getProfile(entry.shortlistedUserId)) || null,
  })));

  res.json({ shortlist: enriched });
}));

router.get('/ids', asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const ids = Array.from(await store.getShortlistedUserIds(userId));
  res.json({ shortlistedUserIds: ids });
}));

router.post('/:userId', asyncHandler(async (req: Request, res: Response) => {
  const currentUserId = (req as any).userId;
  const targetUserId = req.params.userId;
  const { note } = req.body || {};

  if (currentUserId === targetUserId) {
    res.status(400).json({ error: 'Cannot shortlist your own profile' });
    return;
  }

  const targetProfile = await store.getProfile(targetUserId);
  if (!targetProfile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  const entry = await store.addShortlist(currentUserId, targetUserId, note || '');
  res.status(201).json(entry);
}));

router.delete('/:userId', asyncHandler(async (req: Request, res: Response) => {
  const currentUserId = (req as any).userId;
  const targetUserId = req.params.userId;

  const removed = await store.removeShortlist(currentUserId, targetUserId);
  if (!removed) {
    res.status(404).json({ error: 'Shortlist entry not found' });
    return;
  }

  res.json({ success: true });
}));

export default router;
