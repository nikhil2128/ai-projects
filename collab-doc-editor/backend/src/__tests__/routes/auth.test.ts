import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../store/user-store', () => ({
  userStore: {
    createUser: vi.fn(),
    validateCredentials: vi.fn(),
    findById: vi.fn(),
    searchUsers: vi.fn(),
  },
}));

vi.mock('../../middleware/auth', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../middleware/auth')>();
  return {
    ...original,
    authMiddleware: vi.fn((req: any, _res: any, next: any) => {
      if (req.headers.authorization === 'Bearer valid-token') {
        req.user = { id: 'user-1', email: 'test@test.com', name: 'Test User' };
        next();
      } else {
        _res.status(401).json({ error: 'Authentication required' });
      }
    }),
    generateToken: vi.fn(() => 'mock-jwt-token'),
    verifyToken: vi.fn(),
  };
});

import { authRouter } from '../../routes/auth';
import { userStore } from '../../store/user-store';

const mockedUserStore = vi.mocked(userStore);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  return app;
}

describe('Auth Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    app = createApp();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const safeUser = { id: 'user-1', email: 'alice@test.com', name: 'Alice', createdAt: '2024-01-01' };
      mockedUserStore.createUser.mockReturnValue(safeUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'alice@test.com', name: 'Alice', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('token', 'mock-jwt-token');
    });

    it('should return 400 if email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Alice', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('should return 400 if name is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'alice@test.com', password: 'password123' });

      expect(res.status).toBe(400);
    });

    it('should return 400 if password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'alice@test.com', name: 'Alice' });

      expect(res.status).toBe(400);
    });

    it('should return 400 if password is too short', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'alice@test.com', name: 'Alice', password: '123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('6 characters');
    });

    it('should return 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'not-an-email', name: 'Alice', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid email');
    });

    it('should return 409 for duplicate email', async () => {
      mockedUserStore.createUser.mockImplementation(() => {
        throw new Error('Email already registered');
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'alice@test.com', name: 'Alice', password: 'password123' });

      expect(res.status).toBe(409);
    });

    it('should return 500 for unexpected errors', async () => {
      mockedUserStore.createUser.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'alice@test.com', name: 'Alice', password: 'password123' });

      expect(res.status).toBe(500);
    });

    it('should handle non-Error thrown values', async () => {
      mockedUserStore.createUser.mockImplementation(() => {
        throw 'string error';
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'alice@test.com', name: 'Alice', password: 'password123' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Registration failed');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const safeUser = { id: 'user-1', email: 'alice@test.com', name: 'Alice', createdAt: '2024-01-01' };
      mockedUserStore.validateCredentials.mockReturnValue(safeUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@test.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('token');
    });

    it('should return 400 if email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' });

      expect(res.status).toBe(400);
    });

    it('should return 400 if password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@test.com' });

      expect(res.status).toBe(400);
    });

    it('should return 401 for invalid credentials', async () => {
      mockedUserStore.validateCredentials.mockReturnValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@test.com', password: 'wrong' });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user for valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('user');
    });

    it('should return 401 for missing token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/users/search', () => {
    it('should return matching users', async () => {
      const users = [
        { id: 'user-2', email: 'bob@test.com', name: 'Bob', createdAt: '2024-01-01' },
      ];
      mockedUserStore.searchUsers.mockReturnValue(users);

      const res = await request(app)
        .get('/api/auth/users/search?q=bob')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('should return empty array if query is too short', async () => {
      const res = await request(app)
        .get('/api/auth/users/search?q=a')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should exclude specified user ids', async () => {
      mockedUserStore.searchUsers.mockReturnValue([]);

      const res = await request(app)
        .get('/api/auth/users/search?q=bob&exclude=user-3,user-4')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(mockedUserStore.searchUsers).toHaveBeenCalledWith(
        'bob',
        expect.arrayContaining(['user-3', 'user-4', 'user-1'])
      );
    });

    it('should handle empty exclude parameter', async () => {
      mockedUserStore.searchUsers.mockReturnValue([]);

      const res = await request(app)
        .get('/api/auth/users/search?q=bob')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(mockedUserStore.searchUsers).toHaveBeenCalledWith(
        'bob',
        expect.arrayContaining(['user-1'])
      );
    });
  });
});
