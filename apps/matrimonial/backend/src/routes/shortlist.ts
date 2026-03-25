import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { store } from '../data/store.js';

const router = Router();

router.use(authenticateToken);

router.get('/', (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const entries = store.getShortlist(userId);

  const enriched = entries.map(entry => ({
    ...entry,
    profile: store.getProfile(entry.shortlistedUserId) || null,
  }));

  res.json({ shortlist: enriched });
});

router.get('/ids', (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const ids = Array.from(store.getShortlistedUserIds(userId));
  res.json({ shortlistedUserIds: ids });
});

router.post('/:userId', (req: Request, res: Response) => {
  const currentUserId = (req as any).userId;
  const targetUserId = req.params.userId;
  const { note } = req.body || {};

  if (currentUserId === targetUserId) {
    res.status(400).json({ error: 'Cannot shortlist your own profile' });
    return;
  }

  const targetProfile = store.getProfile(targetUserId);
  if (!targetProfile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  const entry = store.addShortlist(currentUserId, targetUserId, note || '');
  res.status(201).json(entry);
});

router.delete('/:userId', (req: Request, res: Response) => {
  const currentUserId = (req as any).userId;
  const targetUserId = req.params.userId;

  const removed = store.removeShortlist(currentUserId, targetUserId);
  if (!removed) {
    res.status(404).json({ error: 'Shortlist entry not found' });
    return;
  }

  res.json({ success: true });
});

export default router;
