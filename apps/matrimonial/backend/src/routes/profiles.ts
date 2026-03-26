import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { store } from '../data/store.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticateToken);

router.get('/me', asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const profile = await store.getProfile(userId);
  if (!profile) {
    res.status(404).json({ error: 'Profile not found. Please build your profile.' });
    return;
  }
  res.json(profile);
}));

router.put('/me', asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const profile = await store.upsertProfile(userId, req.body);
  res.json(profile);
}));

router.get('/browse', asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { gender, minAge, maxAge, religion, profession, salaryRange, location, education, maritalStatus, diet, motherTongue, search, page, pageSize } = req.query;

  const result = await store.browseProfiles(
    userId,
    {
      gender: typeof gender === 'string' && gender !== 'all' ? gender : undefined,
      minAge: typeof minAge === 'string' ? Number(minAge) : undefined,
      maxAge: typeof maxAge === 'string' ? Number(maxAge) : undefined,
      religion: typeof religion === 'string' && religion !== 'all' ? religion : undefined,
      profession: typeof profession === 'string' && profession !== 'all' ? profession : undefined,
      salaryRange: typeof salaryRange === 'string' && salaryRange !== 'all' ? salaryRange : undefined,
      location: typeof location === 'string' && location !== 'all' ? location : undefined,
      education: typeof education === 'string' && education !== 'all' ? education : undefined,
      maritalStatus: typeof maritalStatus === 'string' && maritalStatus !== 'all' ? maritalStatus : undefined,
      diet: typeof diet === 'string' && diet !== 'all' ? diet : undefined,
      motherTongue: typeof motherTongue === 'string' && motherTongue !== 'all' ? motherTongue : undefined,
      search: typeof search === 'string' ? search : undefined,
    },
    typeof page === 'string' ? Number(page) : 1,
    typeof pageSize === 'string' ? Number(pageSize) : undefined,
  );

  res.json(result);
}));

router.get('/recommendations/daily', asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const batch = await store.getRecommendationsForUser(userId);
  const recommendations = (await Promise.all(batch.recommendations.map(async (recommendation) => {
    const profile = await store.getProfile(recommendation.recommendedUserId);
    if (!profile) return [];

    return [{
      ...profile,
      matchPercentage: recommendation.matchPercentage,
      recommendationScore: recommendation.score,
      recommendationReasons: recommendation.reasons,
      recommendationGeneratedAt: recommendation.generatedAt,
    }];
  }))).flat();

  res.json({
    generatedAt: batch.generatedAt,
    basedOnHistory: batch.basedOnHistory,
    shortlistedSignals: batch.shortlistedSignals,
    interestSignals: batch.interestSignals,
    recommendations,
  });
}));

router.get('/:userId', asyncHandler(async (req: Request, res: Response) => {
  const profile = await store.getProfile(req.params.userId);
  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }
  res.json(profile);
}));

router.post('/:userId/interest', asyncHandler(async (req: Request, res: Response) => {
  const fromUserId = (req as any).userId;
  const toUserId = req.params.userId;

  const toProfile = await store.getProfile(toUserId);
  if (!toProfile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  const interest = await store.sendInterest(fromUserId, toUserId);
  res.status(201).json(interest);
}));

router.get('/interests/list', asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { sent, received } = await store.getInterests(userId);

  const enrichSent = await Promise.all(sent.map(async (i) => ({
    ...i,
    profile: await store.getProfile(i.toUserId),
  })));
  const enrichReceived = await Promise.all(received.map(async (i) => ({
    ...i,
    profile: await store.getProfile(i.fromUserId),
  })));

  res.json({ sent: enrichSent, received: enrichReceived });
}));

router.patch('/interests/:interestId', asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body;
  if (!['accepted', 'declined'].includes(status)) {
    res.status(400).json({ error: 'Status must be accepted or declined' });
    return;
  }
  const interest = await store.updateInterestStatus(req.params.interestId, status);
  if (!interest) {
    res.status(404).json({ error: 'Interest not found' });
    return;
  }
  res.json(interest);
}));

export default router;
