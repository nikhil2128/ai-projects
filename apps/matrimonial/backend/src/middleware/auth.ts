import { Request, Response, NextFunction } from 'express';
import { store } from '../data/store.js';

/**
 * Simple token-based auth using base64-encoded user ID.
 * In production, replace with JWT.
 */
export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const userId = Buffer.from(token, 'base64').toString('utf-8');
    const user = await store.getUser(userId);
    if (!user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    await store.markUserActive(userId);
    (req as any).userId = userId;
    (req as any).user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function generateToken(userId: string): string {
  return Buffer.from(userId).toString('base64');
}
