import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { store } from '../data/store.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticateToken);

router.get('/me', asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const familyProfile = await store.getFamilyProfile(userId);
  if (!familyProfile) {
    res.status(404).json({ error: 'Family profile not found' });
    return;
  }
  res.json(familyProfile);
}));

router.put('/me', asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const familyProfile = await store.upsertFamilyProfile(userId, req.body);
  res.json(familyProfile);
}));

router.get('/user/:userId', asyncHandler(async (req: Request, res: Response) => {
  const familyProfile = await store.getFamilyProfile(req.params.userId);
  if (!familyProfile) {
    res.status(404).json({ error: 'Family profile not found' });
    return;
  }
  res.json(familyProfile);
}));

router.post('/share', asyncHandler(async (req: Request, res: Response) => {
  const fromUserId = (req as any).userId;
  const { toUserId, sharedProfileUserId, message } = req.body;

  if (!toUserId || !sharedProfileUserId) {
    res.status(400).json({ error: 'toUserId and sharedProfileUserId are required' });
    return;
  }

  const toProfile = await store.getProfile(toUserId);
  if (!toProfile) {
    res.status(404).json({ error: 'Recipient not found' });
    return;
  }

  const sharedProfile = await store.getProfile(sharedProfileUserId);
  if (!sharedProfile) {
    res.status(404).json({ error: 'Profile to share not found' });
    return;
  }

  const sp = await store.shareProfile(fromUserId, toUserId, sharedProfileUserId, message || '');
  res.status(201).json(sp);
}));

router.get('/shared', asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { sent, received } = await store.getSharedProfiles(userId);

  const enrichSent = await Promise.all(sent.map(async (sp) => ({
    ...sp,
    toProfile: await store.getProfile(sp.toUserId),
    toFamily: await store.getFamilyProfile(sp.toUserId),
    sharedProfile: await store.getProfile(sp.sharedProfileUserId),
    fromProfile: await store.getProfile(sp.fromUserId),
    fromFamily: await store.getFamilyProfile(sp.fromUserId),
  })));

  const enrichReceived = await Promise.all(received.map(async (sp) => ({
    ...sp,
    fromProfile: await store.getProfile(sp.fromUserId),
    fromFamily: await store.getFamilyProfile(sp.fromUserId),
    sharedProfile: await store.getProfile(sp.sharedProfileUserId),
    toProfile: await store.getProfile(sp.toUserId),
    toFamily: await store.getFamilyProfile(sp.toUserId),
  })));

  res.json({ sent: enrichSent, received: enrichReceived });
}));

router.patch('/shared/:id', asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body;
  if (!['viewed', 'interested', 'declined'].includes(status)) {
    res.status(400).json({ error: 'Status must be viewed, interested, or declined' });
    return;
  }
  const sp = await store.updateSharedProfileStatus(req.params.id, status);
  if (!sp) {
    res.status(404).json({ error: 'Shared profile not found' });
    return;
  }
  res.json(sp);
}));

export default router;
