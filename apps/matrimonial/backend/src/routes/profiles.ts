import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { store } from '../data/store.js';

const router = Router();

router.use(authenticateToken);

router.get('/me', (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const profile = store.getProfile(userId);
  if (!profile) {
    res.status(404).json({ error: 'Profile not found. Please build your profile.' });
    return;
  }
  res.json(profile);
});

router.put('/me', (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const profile = store.upsertProfile(userId, req.body);
  res.json(profile);
});

router.get('/browse', (req: Request, res: Response) => {
  const userId = (req as any).userId;
  let results = store.getAllProfiles(userId);

  const { gender, minAge, maxAge, religion, profession, salaryRange, location, education, maritalStatus, diet, motherTongue, search } = req.query;

  if (gender && gender !== 'all') {
    results = results.filter(p => p.gender === gender);
  }
  if (minAge) {
    results = results.filter(p => p.age >= Number(minAge));
  }
  if (maxAge) {
    results = results.filter(p => p.age <= Number(maxAge));
  }
  if (religion && religion !== 'all') {
    results = results.filter(p => p.religion.toLowerCase() === (religion as string).toLowerCase());
  }
  if (profession && profession !== 'all') {
    results = results.filter(p => p.profession.toLowerCase().includes((profession as string).toLowerCase()));
  }
  if (salaryRange && salaryRange !== 'all') {
    results = results.filter(p => p.salaryRange === salaryRange);
  }
  if (location && location !== 'all') {
    results = results.filter(p => p.location.toLowerCase().includes((location as string).toLowerCase()));
  }
  if (education && education !== 'all') {
    results = results.filter(p => p.education.toLowerCase().includes((education as string).toLowerCase()));
  }
  if (maritalStatus && maritalStatus !== 'all') {
    results = results.filter(p => p.maritalStatus === maritalStatus);
  }
  if (diet && diet !== 'all') {
    results = results.filter(p => p.diet === diet);
  }
  if (motherTongue && motherTongue !== 'all') {
    results = results.filter(p => p.motherTongue.toLowerCase() === (motherTongue as string).toLowerCase());
  }
  if (search) {
    const q = (search as string).toLowerCase();
    results = results.filter(p =>
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.profession.toLowerCase().includes(q) ||
      p.location.toLowerCase().includes(q) ||
      p.bio.toLowerCase().includes(q)
    );
  }

  const myProfile = store.getProfile(userId);
  const enriched = results.map(profile => {
    let matchScore = 0;
    let factors = 0;

    if (myProfile) {
      if (myProfile.religion && profile.religion === myProfile.religion) { matchScore += 15; }
      factors += 15;

      if (myProfile.motherTongue && profile.motherTongue === myProfile.motherTongue) { matchScore += 10; }
      factors += 10;

      if (myProfile.location && profile.location === myProfile.location) { matchScore += 10; }
      else if (myProfile.state && profile.state === myProfile.state) { matchScore += 5; }
      factors += 10;

      if (myProfile.education && profile.education === myProfile.education) { matchScore += 10; }
      factors += 10;

      if (myProfile.diet && profile.diet === myProfile.diet) { matchScore += 5; }
      factors += 5;

      if (myProfile.interests && profile.interests) {
        const common = myProfile.interests.filter(i => profile.interests.includes(i));
        matchScore += Math.min(common.length * 5, 20);
      }
      factors += 20;

      if (myProfile.familyType && profile.familyType === myProfile.familyType) { matchScore += 5; }
      factors += 5;

      matchScore += 25;
      factors += 25;
    }

    const matchPercentage = factors > 0 ? Math.round((matchScore / factors) * 100) : 50;

    return { ...profile, matchPercentage: Math.min(matchPercentage, 99) };
  });

  enriched.sort((a, b) => b.matchPercentage - a.matchPercentage);

  res.json({ profiles: enriched, total: enriched.length });
});

router.get('/recommendations/daily', (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const batch = store.getRecommendationsForUser(userId);
  const recommendations = batch.recommendations.flatMap(recommendation => {
    const profile = store.getProfile(recommendation.recommendedUserId);
    if (!profile) return [];

    return [{
      ...profile,
      matchPercentage: recommendation.matchPercentage,
      recommendationScore: recommendation.score,
      recommendationReasons: recommendation.reasons,
      recommendationGeneratedAt: recommendation.generatedAt,
    }];
  });

  res.json({
    generatedAt: batch.generatedAt,
    basedOnHistory: batch.basedOnHistory,
    shortlistedSignals: batch.shortlistedSignals,
    interestSignals: batch.interestSignals,
    recommendations,
  });
});

router.get('/:userId', (req: Request, res: Response) => {
  const profile = store.getProfile(req.params.userId);
  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }
  res.json(profile);
});

router.post('/:userId/interest', (req: Request, res: Response) => {
  const fromUserId = (req as any).userId;
  const toUserId = req.params.userId;

  const toProfile = store.getProfile(toUserId);
  if (!toProfile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  const interest = store.sendInterest(fromUserId, toUserId);
  res.status(201).json(interest);
});

router.get('/interests/list', (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { sent, received } = store.getInterests(userId);

  const enrichSent = sent.map(i => ({
    ...i,
    profile: store.getProfile(i.toUserId),
  }));
  const enrichReceived = received.map(i => ({
    ...i,
    profile: store.getProfile(i.fromUserId),
  }));

  res.json({ sent: enrichSent, received: enrichReceived });
});

router.patch('/interests/:interestId', (req: Request, res: Response) => {
  const { status } = req.body;
  if (!['accepted', 'declined'].includes(status)) {
    res.status(400).json({ error: 'Status must be accepted or declined' });
    return;
  }
  const interest = store.updateInterestStatus(req.params.interestId, status);
  if (!interest) {
    res.status(404).json({ error: 'Interest not found' });
    return;
  }
  res.json(interest);
});

export default router;
