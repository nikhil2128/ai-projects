import { Router, Request, Response } from 'express';
import { userStore } from '../store/user-store';
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth';

export const authRouter = Router();

authRouter.post('/register', (req: Request, res: Response) => {
  const { email, name, password } = req.body;

  if (!email || !name || !password) {
    res.status(400).json({ error: 'Email, name, and password are required' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: 'Invalid email address' });
    return;
  }

  try {
    const user = userStore.createUser(email, name, password);
    const token = generateToken(user.id);
    res.status(201).json({ user, token });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    if (message === 'Email already registered') {
      res.status(409).json({ error: message });
      return;
    }
    res.status(500).json({ error: message });
  }
});

authRouter.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = userStore.validateCredentials(email, password);
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = generateToken(user.id);
  res.json({ user, token });
});

authRouter.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

authRouter.get('/users/search', authMiddleware, (req: AuthRequest, res: Response) => {
  const q = (req.query.q as string) || '';
  const excludeRaw = (req.query.exclude as string) || '';
  const excludeIds = excludeRaw ? excludeRaw.split(',') : [];
  if (req.user) {
    excludeIds.push(req.user.id);
  }

  if (q.length < 2) {
    res.json([]);
    return;
  }

  const users = userStore.searchUsers(q, excludeIds);
  res.json(users);
});
