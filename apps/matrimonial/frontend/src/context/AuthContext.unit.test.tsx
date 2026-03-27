import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext';
import { sampleFamilyProfile, sampleProfile } from '../test/fixtures';

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    auth: {
      login: vi.fn(),
      register: vi.fn(),
      me: vi.fn(),
    },
  },
}));

vi.mock('../api', () => ({
  api: mockApi,
}));

function Consumer() {
  const auth = useAuth();

  return (
    <div>
      <div>{auth.loading ? 'loading' : 'ready'}</div>
      <div>{auth.user?.email ?? 'no-user'}</div>
      <div>{auth.profile?.firstName ?? 'no-profile'}</div>
      <div>{auth.familyProfile?.fatherName ?? 'no-family'}</div>
      <div>{auth.token ?? 'no-token'}</div>
      <button onClick={() => auth.login('user@example.com', 'password123')}>login</button>
      <button onClick={() => auth.register('user@example.com', 'password123', 'Asha', 'Verma')}>register</button>
      <button onClick={auth.logout}>logout</button>
      <button onClick={() => auth.refreshProfile()}>refresh</button>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.values(mockApi.auth).forEach((method) => method.mockReset());
  });

  it('resolves to a logged-out state when there is no token', async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await screen.findByText('ready');

    expect(screen.getByText('no-user')).toBeInTheDocument();
    expect(screen.getByText('no-token')).toBeInTheDocument();
    expect(mockApi.auth.me).not.toHaveBeenCalled();
  });

  it('hydrates the user when an existing token is valid', async () => {
    window.localStorage.setItem('token', 'existing-token');
    mockApi.auth.me.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: sampleProfile,
      familyProfile: sampleFamilyProfile,
      hasProfile: true,
      hasFamilyProfile: true,
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await screen.findByText('ready');

    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    expect(screen.getByText('Asha')).toBeInTheDocument();
    expect(screen.getByText('Rajesh Verma')).toBeInTheDocument();
    expect(screen.getByText('existing-token')).toBeInTheDocument();
  });

  it('clears invalid tokens when profile hydration fails', async () => {
    window.localStorage.setItem('token', 'bad-token');
    mockApi.auth.me.mockRejectedValue(new Error('invalid token'));

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await screen.findByText('ready');

    expect(window.localStorage.getItem('token')).toBeNull();
    expect(screen.getByText('no-user')).toBeInTheDocument();
  });

  it('stores the token and refreshes the session after login', async () => {
    const user = userEvent.setup();
    mockApi.auth.login.mockResolvedValue({
      token: 'new-token',
      user: { id: 'user-1', email: 'user@example.com' },
    });
    mockApi.auth.me.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: sampleProfile,
      familyProfile: null,
      hasProfile: true,
      hasFamilyProfile: false,
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await screen.findByText('ready');
    await user.click(screen.getByRole('button', { name: 'login' }));

    await waitFor(() => {
      expect(window.localStorage.getItem('token')).toBe('new-token');
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
      expect(screen.getByText('Asha')).toBeInTheDocument();
    });
  });

  it('stores the token and refreshes the session after registration', async () => {
    const user = userEvent.setup();
    mockApi.auth.register.mockResolvedValue({
      token: 'registered-token',
      user: { id: 'user-1', email: 'user@example.com' },
    });
    mockApi.auth.me.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: sampleProfile,
      familyProfile: sampleFamilyProfile,
      hasProfile: true,
      hasFamilyProfile: true,
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await screen.findByText('ready');
    await user.click(screen.getByRole('button', { name: 'register' }));

    await waitFor(() => {
      expect(window.localStorage.getItem('token')).toBe('registered-token');
      expect(screen.getByText('Rajesh Verma')).toBeInTheDocument();
    });
  });

  it('supports manual refresh and logout', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem('token', 'existing-token');
    mockApi.auth.me
      .mockResolvedValueOnce({
        user: { id: 'user-1', email: 'user@example.com' },
        profile: null,
        familyProfile: null,
        hasProfile: false,
        hasFamilyProfile: false,
      })
      .mockResolvedValueOnce({
        user: { id: 'user-1', email: 'user@example.com' },
        profile: sampleProfile,
        familyProfile: null,
        hasProfile: true,
        hasFamilyProfile: false,
      });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await screen.findByText('ready');
    await user.click(screen.getByRole('button', { name: 'refresh' }));

    await waitFor(() => {
      expect(screen.getByText('Asha')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'logout' }));

    expect(window.localStorage.getItem('token')).toBeNull();
    expect(screen.getByText('no-user')).toBeInTheDocument();
  });

  it('throws when useAuth is used outside the provider', () => {
    expect(() => render(<Consumer />)).toThrow('useAuth must be used within AuthProvider');
  });

  it('can refresh state from an imperative act call', async () => {
    window.localStorage.setItem('token', 'existing-token');
    mockApi.auth.me.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: sampleProfile,
      familyProfile: null,
      hasProfile: true,
      hasFamilyProfile: false,
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText('Asha')).toBeInTheDocument();
  });
});
