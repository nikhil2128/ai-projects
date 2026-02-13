import { Router, Request, Response } from 'express';
import { AuthService, registerSchema, loginSchema } from '../services/auth.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const authService = new AuthService();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const input = registerSchema.parse(req.body);
    const result = await authService.register(input);
    res.status(201).json(result);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    if (error.message === 'Email already registered') {
      res.status(409).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    res.json(result);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    if (error.message === 'Invalid email or password') {
      res.status(401).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await authService.getProfile(req.user!.userId);
    res.json(user);
  } catch (error: any) {
    if (error.message === 'User not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

export default router;
