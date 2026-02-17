import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

vi.mock('../../store/user-store', () => ({
  userStore: {
    findById: vi.fn(),
  },
}));

import { generateToken, verifyToken, authMiddleware, AuthRequest } from '../../middleware/auth';
import { userStore } from '../../store/user-store';

const mockedUserStore = vi.mocked(userStore);

describe('Auth Middleware', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateToken()', () => {
    it('should generate a valid JWT token string', () => {
      const token = generateToken('user-123');
      expect(typeof token).toBe('string');
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
    });

    it('should generate different tokens for different user IDs', () => {
      const token1 = generateToken('user-1');
      const token2 = generateToken('user-2');
      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyToken()', () => {
    it('should verify a valid token and return payload', () => {
      const token = generateToken('user-123');
      const payload = verifyToken(token);
      expect(payload).toBeDefined();
      expect(payload!.userId).toBe('user-123');
      expect(payload!.iat).toBeDefined();
      expect(payload!.exp).toBeDefined();
    });

    it('should return null for invalid token', () => {
      expect(verifyToken('invalid.token.here')).toBeNull();
    });

    it('should return null for token with wrong format', () => {
      expect(verifyToken('not-a-jwt')).toBeNull();
    });

    it('should return null for token with tampered payload', () => {
      const token = generateToken('user-123');
      const parts = token.split('.');
      const tamperedPayload = Buffer.from(
        JSON.stringify({ userId: 'hacker', iat: 0, exp: 9999999999 })
      ).toString('base64url');
      const tampered = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
      expect(verifyToken(tampered)).toBeNull();
    });

    it('should return null for expired token', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({ userId: 'test', iat: 1000000, exp: 1000001 })
      ).toString('base64url');
      const fakeToken = `${header}.${payload}.fakesig`;
      expect(verifyToken(fakeToken)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(verifyToken('')).toBeNull();
    });
  });

  describe('authMiddleware()', () => {
    let mockReq: Partial<AuthRequest>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    let statusFn: ReturnType<typeof vi.fn>;
    let jsonFn: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      jsonFn = vi.fn();
      statusFn = vi.fn().mockReturnValue({ json: jsonFn });

      mockReq = {
        headers: {},
      };
      mockRes = {
        status: statusFn,
        json: jsonFn,
      } as Partial<Response>;
      mockNext = vi.fn();
    });

    it('should return 401 if no authorization header', () => {
      authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect(statusFn).toHaveBeenCalledWith(401);
      expect(jsonFn).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header does not start with Bearer', () => {
      mockReq.headers = { authorization: 'Basic something' };
      authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect(statusFn).toHaveBeenCalledWith(401);
    });

    it('should return 401 if token is invalid', () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };
      authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect(statusFn).toHaveBeenCalledWith(401);
      expect(jsonFn).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    });

    it('should return 401 if user not found', () => {
      const token = generateToken('user-123');
      mockReq.headers = { authorization: `Bearer ${token}` };
      mockedUserStore.findById.mockReturnValue(undefined);

      authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect(statusFn).toHaveBeenCalledWith(401);
      expect(jsonFn).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should set req.user and call next() for valid token', () => {
      const token = generateToken('user-123');
      mockReq.headers = { authorization: `Bearer ${token}` };
      mockedUserStore.findById.mockReturnValue({
        id: 'user-123',
        email: 'test@test.com',
        name: 'Test',
        passwordHash: 'salt:hash',
        createdAt: '2024-01-01T00:00:00.000Z',
      });

      authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user!.id).toBe('user-123');
      expect(mockReq.user).not.toHaveProperty('passwordHash');
    });
  });
});
