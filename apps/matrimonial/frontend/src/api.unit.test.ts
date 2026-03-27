import { api } from './api';

describe('api client', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('adds the auth token to outgoing requests', async () => {
    window.localStorage.setItem('token', 'secret-token');
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ user: { id: '1', email: 'test@example.com' } }),
    });

    await api.auth.me();

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/me', expect.objectContaining({
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: 'Bearer secret-token',
      }),
    }));
  });

  it('throws the API error message when the response fails', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValue({ error: 'Invalid email or password' }),
    });

    await expect(api.auth.login({ email: 'bad@example.com', password: 'wrong' })).rejects.toThrow(
      'Invalid email or password',
    );
  });

  it('falls back to HTTP status errors when the API body has no message', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({}),
    });

    await expect(api.shortlist.getAll()).rejects.toThrow('HTTP 500');
  });

  it('builds browse query strings and omits empty filters', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ profiles: [], total: 0, page: 2, pageSize: 12 }),
    });

    await api.profiles.browse(
      {
        gender: 'female',
        religion: '',
        location: 'Bengaluru',
        search: 'product',
      },
      2,
      12,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/profiles/browse?gender=female&location=Bengaluru&search=product&page=2&pageSize=12',
      expect.any(Object),
    );
  });

  it('sends shortlist notes with an empty-string fallback', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true }),
    });

    await api.shortlist.add('user-2');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/shortlist/user-2',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ note: '' }),
      }),
    );
  });

  it('routes the remaining API helpers to the expected endpoints', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    });

    await api.auth.register({ email: 'a@example.com', password: 'password123', firstName: 'Asha', lastName: 'Verma' });
    await api.profiles.getMyProfile();
    await api.profiles.updateMyProfile({ firstName: 'Asha' });
    await api.profiles.getRecommendations();
    await api.profiles.getProfile('user-2');
    await api.profiles.sendInterest('user-2');
    await api.profiles.getInterests();
    await api.profiles.updateInterest('interest-1', 'accepted');
    await api.family.getMyFamilyProfile();
    await api.family.updateMyFamilyProfile({ fatherName: 'Rajesh' });
    await api.family.getFamilyProfile('user-2');
    await api.family.shareProfile({ toUserId: 'user-2', sharedProfileUserId: 'user-3', message: 'Look' });
    await api.family.getSharedProfiles();
    await api.family.updateSharedProfileStatus('share-1', 'viewed');
    await api.shortlist.getIds();
    await api.shortlist.remove('user-2');

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/auth/register', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/profiles/me', expect.any(Object));
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/profiles/me', expect.objectContaining({ method: 'PUT' }));
    expect(fetchMock).toHaveBeenNthCalledWith(4, '/api/profiles/recommendations/daily', expect.any(Object));
    expect(fetchMock).toHaveBeenNthCalledWith(5, '/api/profiles/user-2', expect.any(Object));
    expect(fetchMock).toHaveBeenNthCalledWith(6, '/api/profiles/user-2/interest', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenNthCalledWith(7, '/api/profiles/interests/list', expect.any(Object));
    expect(fetchMock).toHaveBeenNthCalledWith(8, '/api/profiles/interests/interest-1', expect.objectContaining({ method: 'PATCH' }));
    expect(fetchMock).toHaveBeenNthCalledWith(9, '/api/family/me', expect.any(Object));
    expect(fetchMock).toHaveBeenNthCalledWith(10, '/api/family/me', expect.objectContaining({ method: 'PUT' }));
    expect(fetchMock).toHaveBeenNthCalledWith(11, '/api/family/user/user-2', expect.any(Object));
    expect(fetchMock).toHaveBeenNthCalledWith(12, '/api/family/share', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenNthCalledWith(13, '/api/family/shared', expect.any(Object));
    expect(fetchMock).toHaveBeenNthCalledWith(14, '/api/family/shared/share-1', expect.objectContaining({ method: 'PATCH' }));
    expect(fetchMock).toHaveBeenNthCalledWith(15, '/api/shortlist/ids', expect.any(Object));
    expect(fetchMock).toHaveBeenNthCalledWith(16, '/api/shortlist/user-2', expect.objectContaining({ method: 'DELETE' }));
  });
});
