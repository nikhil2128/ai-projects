import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { store } from '../data/store.js';

const router = Router();

router.use(authenticateToken);

router.get('/me', (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const familyProfile = store.getFamilyProfile(userId);
  if (!familyProfile) {
    res.status(404).json({ error: 'Family profile not found' });
    return;
  }
  res.json(familyProfile);
});

router.put('/me', (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const familyProfile = store.upsertFamilyProfile(userId, req.body);
  res.json(familyProfile);
});

router.get('/user/:userId', (req: Request, res: Response) => {
  const familyProfile = store.getFamilyProfile(req.params.userId);
  if (!familyProfile) {
    res.status(404).json({ error: 'Family profile not found' });
    return;
  }
  res.json(familyProfile);
});

router.post('/share', (req: Request, res: Response) => {
  const fromUserId = (req as any).userId;
  const { toUserId, sharedProfileUserId, message } = req.body;

  if (!toUserId || !sharedProfileUserId) {
    res.status(400).json({ error: 'toUserId and sharedProfileUserId are required' });
    return;
  }

  const toProfile = store.getProfile(toUserId);
  if (!toProfile) {
    res.status(404).json({ error: 'Recipient not found' });
    return;
  }

  const sharedProfile = store.getProfile(sharedProfileUserId);
  if (!sharedProfile) {
    res.status(404).json({ error: 'Profile to share not found' });
    return;
  }

  const sp = store.shareProfile(fromUserId, toUserId, sharedProfileUserId, message || '');
  res.status(201).json(sp);
});

router.get('/shared', (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { sent, received } = store.getSharedProfiles(userId);

  const enrichSent = sent.map(sp => ({
    ...sp,
    toProfile: store.getProfile(sp.toUserId),
    toFamily: store.getFamilyProfile(sp.toUserId),
    sharedProfile: store.getProfile(sp.sharedProfileUserId),
    fromProfile: store.getProfile(sp.fromUserId),
    fromFamily: store.getFamilyProfile(sp.fromUserId),
  }));

  const enrichReceived = received.map(sp => ({
    ...sp,
    fromProfile: store.getProfile(sp.fromUserId),
    fromFamily: store.getFamilyProfile(sp.fromUserId),
    sharedProfile: store.getProfile(sp.sharedProfileUserId),
    toProfile: store.getProfile(sp.toUserId),
    toFamily: store.getFamilyProfile(sp.toUserId),
  }));

  res.json({ sent: enrichSent, received: enrichReceived });
});

router.patch('/shared/:id', (req: Request, res: Response) => {
  const { status } = req.body;
  if (!['viewed', 'interested', 'declined'].includes(status)) {
    res.status(400).json({ error: 'Status must be viewed, interested, or declined' });
    return;
  }
  const sp = store.updateSharedProfileStatus(req.params.id, status);
  if (!sp) {
    res.status(404).json({ error: 'Shared profile not found' });
    return;
  }
  res.json(sp);
});

export default router;
