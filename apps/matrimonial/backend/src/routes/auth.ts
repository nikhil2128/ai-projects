import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { store } from '../data/store.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/register', (req: Request, res: Response) => {
  const { email, password, firstName, lastName } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const existing = store.findUserByEmail(email);
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const user = store.createUser(email, password);
  const token = generateToken(user.id);

  if (firstName || lastName) {
    store.upsertProfile(user.id, { firstName: firstName ?? '', lastName: lastName ?? '' });
  }

  res.status(201).json({
    token,
    user: { id: user.id, email: user.email },
  });
});

router.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = store.findUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = generateToken(user.id);
  res.json({
    token,
    user: { id: user.id, email: user.email },
  });
});

router.get('/me', authenticateToken, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const user = store.getUser(userId);
  const profile = store.getProfile(userId);
  const familyProfile = store.getFamilyProfile(userId);

  res.json({
    user: { id: user!.id, email: user!.email },
    profile: profile ?? null,
    familyProfile: familyProfile ?? null,
    hasProfile: !!profile?.firstName,
    hasFamilyProfile: !!familyProfile?.fatherName || !!familyProfile?.motherName,
  });
});

export default router;
