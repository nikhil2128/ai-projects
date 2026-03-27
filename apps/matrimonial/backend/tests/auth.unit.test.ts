import type { NextFunction, Request, Response } from 'express';
import { mockStore, resetMockStore, sampleUser } from './helpers/storeMock';
import { authenticateToken, generateToken } from '../src/middleware/auth.js';

vi.mock('../src/data/store.js', () => ({
  store: mockStore,
}));

describe('auth middleware', () => {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const next = vi.fn() as NextFunction;

  beforeEach(() => {
    resetMockStore();
    json.mockReset();
    status.mockClear();
    next.mockClear();
  });

  it('generates base64 tokens', () => {
    expect(generateToken('user-1')).toBe(Buffer.from('user-1').toString('base64'));
  });

  it('rejects requests without a bearer token', async () => {
    const req = { headers: {} } as Request;
    const res = { status } as unknown as Response;

    await authenticateToken(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects unknown users', async () => {
    mockStore.getUser.mockResolvedValue(null);
    const req = { headers: { authorization: `Bearer ${generateToken('missing-user')}` } } as Request;
    const res = { status } as unknown as Response;

    await authenticateToken(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: 'Invalid token' });
  });

  it('marks the user active and populates the request on success', async () => {
    mockStore.getUser.mockResolvedValue(sampleUser);
    mockStore.markUserActive.mockResolvedValue(undefined);
    const req = { headers: { authorization: `Bearer ${generateToken(sampleUser.id)}` } } as Request;
    const res = { status } as unknown as Response;

    await authenticateToken(req, res, next);

    expect(mockStore.markUserActive).toHaveBeenCalledWith(sampleUser.id);
    expect((req as any).userId).toBe(sampleUser.id);
    expect((req as any).user).toEqual(sampleUser);
    expect(next).toHaveBeenCalled();
  });
});
