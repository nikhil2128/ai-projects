import { api } from './api';

describe('api client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as jest.Mock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    localStorage.clear();
  });

  it('sends JSON request with token authorization', async () => {
    localStorage.setItem('token', 'abc123');
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ accessToken: 'x', user: { id: 1, username: 'u', email: 'e' } }),
    });

    await api.auth.login({ username: 'u', password: 'p' });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer abc123',
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('does not force json content-type for FormData', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1 }),
    });
    const fd = new FormData();
    fd.append('image', new Blob(['x']), 'a.png');

    await api.posts.create(fd);

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.headers['Content-Type']).toBeUndefined();
  });

  it('throws error message from failing response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      statusText: 'Bad',
      json: async () => ({ message: 'Denied' }),
    });

    await expect(api.users.getProfile('alice')).rejects.toThrow('Denied');
  });

  it('falls back to status text when error JSON parsing fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      statusText: 'Service Unavailable',
      json: async () => {
        throw new Error('bad-json');
      },
    });

    await expect(api.auth.me()).rejects.toThrow('Service Unavailable');
  });

  it('exposes wrapper methods for users, follows, posts and reactions', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await api.auth.register({
      username: 'new-user',
      email: 'new-user@example.com',
      password: 'secret123',
      displayName: 'New User',
    });
    await api.auth.me();
    await api.users.search('al');
    await api.follows.follow('bob');
    await api.follows.unfollow('bob');
    await api.posts.getFeed(2);
    await api.posts.getUserPosts('bob');
    await api.posts.delete(5);
    await api.reactions.toggle(5, '🔥');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/users/search?q=al',
      expect.any(Object),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/posts/feed?page=2',
      expect.any(Object),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/posts/5/reactions',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('builds image URL from API base', () => {
    expect(api.getImageUrl('/uploads/a.png')).toBe(
      'http://localhost:3000/uploads/a.png',
    );
  });
});
