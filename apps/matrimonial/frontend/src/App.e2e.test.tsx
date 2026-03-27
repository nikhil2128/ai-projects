import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { sampleProfile } from './test/fixtures';

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    auth: {
      login: vi.fn(),
      register: vi.fn(),
      me: vi.fn(),
    },
    profiles: {
      updateMyProfile: vi.fn(),
      browse: vi.fn(),
      getRecommendations: vi.fn(),
    },
    shortlist: {
      getIds: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
    },
  },
}));

vi.mock('./api', () => ({
  api: mockApi,
}));

describe('frontend app flows', () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.values(mockApi.auth).forEach((method) => method.mockReset());
    Object.values(mockApi.profiles).forEach((method) => method.mockReset());
    Object.values(mockApi.shortlist).forEach((method) => method.mockReset());
    window.history.pushState({}, 'Test page', '/');
  });

  it('redirects unauthenticated visitors to the login page', async () => {
    render(<App />);

    expect(await screen.findByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByText('Demo Accounts:')).toBeInTheDocument();
  });

  it('shows login errors from the auth provider', async () => {
    const user = userEvent.setup();
    mockApi.auth.login.mockRejectedValue(new Error('Invalid email or password'));

    render(<App />);

    await user.type(screen.getByPlaceholderText('you@example.com'), 'bad@example.com');
    await user.type(screen.getByPlaceholderText('Enter your password'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
  });

  it('logs in, loads browse data, and toggles shortlist state', async () => {
    const user = userEvent.setup();
    mockApi.auth.login.mockResolvedValue({
      token: 'token-123',
      user: { id: 'user-1', email: 'user@example.com' },
    });
    mockApi.auth.me.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: sampleProfile,
      familyProfile: null,
      hasProfile: true,
      hasFamilyProfile: false,
    });
    mockApi.shortlist.getIds.mockResolvedValue({ shortlistedUserIds: ['user-1'] });
    mockApi.profiles.getRecommendations.mockResolvedValue({
      generatedAt: '2026-01-02T00:00:00.000Z',
      basedOnHistory: true,
      shortlistedSignals: 4,
      interestSignals: 2,
      recommendations: [sampleProfile],
    });
    mockApi.profiles.browse.mockResolvedValue({
      profiles: [sampleProfile],
      total: 1,
      page: 1,
      pageSize: 24,
    });
    mockApi.shortlist.remove.mockResolvedValue({ success: true });

    render(<App />);

    await user.type(screen.getByPlaceholderText('you@example.com'), 'user@example.com');
    await user.type(screen.getByPlaceholderText('Enter your password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Discover Your Match')).toBeInTheDocument();
    expect(await screen.findByText('Daily picks for active members')).toBeInTheDocument();
    expect(window.localStorage.getItem('token')).toBe('token-123');

    await waitFor(() => {
      expect(mockApi.profiles.browse).toHaveBeenCalledWith({}, 1, 24);
    });

    await user.click(screen.getByRole('button', { name: /filters/i }));
    await user.type(screen.getByPlaceholderText('Search by name, profession, or location...'), 'Asha');
    await waitFor(() => {
      expect(mockApi.profiles.browse).toHaveBeenLastCalledWith({ search: 'Asha' }, 1, 24);
    });

    await user.click(screen.getAllByTitle('Remove from shortlist')[0]);
    expect(mockApi.shortlist.remove).toHaveBeenCalledWith('user-1');
  });

  it('validates register form passwords before calling the API', async () => {
    const user = userEvent.setup();
    window.history.pushState({}, 'Register page', '/register');

    render(<App />);

    await user.type(screen.getByPlaceholderText('First name'), 'Asha');
    await user.type(screen.getByPlaceholderText('Last name'), 'Verma');
    await user.type(screen.getByPlaceholderText('you@example.com'), 'asha@example.com');
    await user.type(screen.getByPlaceholderText('Min. 6 characters'), 'password123');
    await user.type(screen.getByPlaceholderText('Re-enter password'), 'different123');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(mockApi.auth.register).not.toHaveBeenCalled();
  });

  it('registers a user, completes profile setup, and lands on browse', async () => {
    const user = userEvent.setup();
    window.history.pushState({}, 'Register page', '/register');
    mockApi.auth.register.mockResolvedValue({
      token: 'registered-token',
      user: { id: 'user-1', email: 'asha@example.com' },
    });
    mockApi.auth.me
      .mockResolvedValueOnce({
        user: { id: 'user-1', email: 'asha@example.com' },
        profile: null,
        familyProfile: null,
        hasProfile: false,
        hasFamilyProfile: false,
      })
      .mockResolvedValueOnce({
        user: { id: 'user-1', email: 'asha@example.com' },
        profile: sampleProfile,
        familyProfile: null,
        hasProfile: true,
        hasFamilyProfile: false,
      });
    mockApi.profiles.updateMyProfile.mockResolvedValue(sampleProfile);
    mockApi.shortlist.getIds.mockResolvedValue({ shortlistedUserIds: [] });
    mockApi.profiles.getRecommendations.mockResolvedValue({
      generatedAt: '2026-01-02T00:00:00.000Z',
      basedOnHistory: false,
      shortlistedSignals: 0,
      interestSignals: 0,
      recommendations: [],
    });
    mockApi.profiles.browse.mockResolvedValue({
      profiles: [sampleProfile],
      total: 1,
      page: 1,
      pageSize: 24,
    });

    render(<App />);

    await user.type(screen.getByPlaceholderText('First name'), 'Asha');
    await user.type(screen.getByPlaceholderText('Last name'), 'Verma');
    await user.type(screen.getByPlaceholderText('you@example.com'), 'asha@example.com');
    await user.type(screen.getByPlaceholderText('Min. 6 characters'), 'password123');
    await user.type(screen.getByPlaceholderText('Re-enter password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(await screen.findByText('Build Your Profile')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /travel/i }));
    await user.type(screen.getByPlaceholderText('Tell others about yourself, your values, and what makes you unique...'), 'Warm and ambitious.');
    await user.type(screen.getByPlaceholderText('Describe the qualities you value in a partner...'), 'A grounded and caring partner.');
    await user.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() => {
      expect(mockApi.profiles.updateMyProfile).toHaveBeenCalled();
    });

    expect(await screen.findByText('Discover Your Match')).toBeInTheDocument();
  });
});
