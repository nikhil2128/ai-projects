import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './auth';
import { api } from './api';

jest.mock('./api', () => ({
  api: {
    auth: {
      me: jest.fn(),
      login: jest.fn(),
      register: jest.fn(),
    },
  },
}));

function Harness() {
  const { user, token, loading, login, register, logout } = useAuth();
  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="token">{token ?? ''}</div>
      <div data-testid="username">{user?.username ?? ''}</div>
      <button onClick={() => login('alice', 'secret')}>login</button>
      <button onClick={() => register('bob', 'b@x.com', 'secret', 'Bob')}>register</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('loads user from saved token', async () => {
    localStorage.setItem('token', 'saved-token');
    (api.auth.me as jest.Mock).mockResolvedValue({
      id: 1,
      username: 'alice',
      email: 'alice@example.com',
    });

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('token')).toHaveTextContent('saved-token');
    expect(screen.getByTestId('username')).toHaveTextContent('alice');
  });

  it('clears broken token when me request fails', async () => {
    localStorage.setItem('token', 'bad-token');
    (api.auth.me as jest.Mock).mockRejectedValue(new Error('nope'));

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(localStorage.getItem('token')).toBeNull();
    expect(screen.getByTestId('token')).toHaveTextContent('');
  });

  it('supports login, register and logout actions', async () => {
    (api.auth.me as jest.Mock).mockResolvedValue(null);
    (api.auth.login as jest.Mock).mockResolvedValue({
      accessToken: 'token-login',
      user: { id: 1, username: 'alice', email: 'alice@example.com' },
    });
    (api.auth.register as jest.Mock).mockResolvedValue({
      accessToken: 'token-register',
      user: { id: 2, username: 'bob', email: 'bob@example.com' },
    });
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await user.click(screen.getByRole('button', { name: 'login' }));
    expect(localStorage.getItem('token')).toBe('token-login');
    expect(screen.getByTestId('username')).toHaveTextContent('alice');

    await user.click(screen.getByRole('button', { name: 'register' }));
    expect(localStorage.getItem('token')).toBe('token-register');
    expect(screen.getByTestId('username')).toHaveTextContent('bob');

    await user.click(screen.getByRole('button', { name: 'logout' }));
    expect(localStorage.getItem('token')).toBeNull();
    expect(screen.getByTestId('username')).toHaveTextContent('');
  });

  it('throws when useAuth is called outside provider', () => {
    const BadHarness = () => {
      useAuth();
      return null;
    };

    expect(() => render(<BadHarness />)).toThrow(
      'useAuth must be used within AuthProvider',
    );
  });
});
