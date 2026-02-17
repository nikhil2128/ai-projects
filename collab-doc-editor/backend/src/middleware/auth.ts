import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { userStore, SafeUser } from '../store/user-store';

const JWT_SECRET = process.env.JWT_SECRET || 'collab-doc-editor-dev-secret-change-in-production';

export interface AuthRequest extends Request {
  user?: SafeUser;
}

interface JwtHeader {
  alg: string;
  typ: string;
}

interface JwtPayload {
  userId: string;
  iat: number;
  exp: number;
}

function base64urlEncode(data: string): string {
  return Buffer.from(data).toString('base64url');
}

function base64urlDecode(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf-8');
}

function sign(payload: object): string {
  const header: JwtHeader = { alg: 'HS256', typ: 'JWT' };
  const headerStr = base64urlEncode(JSON.stringify(header));
  const payloadStr = base64urlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerStr}.${payloadStr}`)
    .digest('base64url');
  return `${headerStr}.${payloadStr}.${signature}`;
}

function verify(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerStr, payloadStr, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${headerStr}.${payloadStr}`)
      .digest('base64url');

    if (signature !== expectedSig) return null;

    const payload: JwtPayload = JSON.parse(base64urlDecode(payloadStr));
    if (payload.exp && Date.now() > payload.exp * 1000) return null;

    return payload;
  } catch {
    return null;
  }
}

export function generateToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  return sign({
    userId,
    iat: now,
    exp: now + 7 * 24 * 60 * 60, // 7 days
  });
}

export function verifyToken(token: string): JwtPayload | null {
  return verify(token);
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verify(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const user = userStore.findById(payload.userId);
  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  const { passwordHash: _, ...safeUser } = user;
  req.user = safeUser;
  next();
}
