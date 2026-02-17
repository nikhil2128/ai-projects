import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

function TestConsumer() {
  const { user, token, loading, login, register, logout } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      await login('test@test.com', 'pass');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleRegister = async () => {
    try {
      await register('test@test.com', 'Test', 'pass');
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="user">{user ? JSON.stringify(user) : 'null'}</div>
      <div data-testid="token">{token ?? 'null'}</div>
      <div data-testid="error">{error ?? 'null'}</div>
      <button onClick={handleLogin}>Login</button>
      <button onClick={handleRegister}>Register</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem('collab-auth-token');
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    localStorage.removeItem('collab-auth-token');
    vi.unstubAllGlobals();
  });

  it('should provide initial loading state with no token', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
  });

  it('should auto-fetch user if token exists in localStorage', async () => {
    localStorage.setItem('collab-auth-token', 'existing-token');
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user: { id: '1', email: 'a@b.com', name: 'A' } }),
    } as Response);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toContain('a@b.com');
    });
  });

  it('should clear token on failed auto-fetch', async () => {
    localStorage.setItem('collab-auth-token', 'bad-token');
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Invalid' }),
    } as Response);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('token').textContent).toBe('null');
    });
  });

  it('should login successfully', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          user: { id: '1', email: 'test@test.com', name: 'Test' },
          token: 'new-token',
        }),
    } as Response);

    await user.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toContain('test@test.com');
      expect(screen.getByTestId('token').textContent).toBe('new-token');
    });
  });

  it('should show error on login failure', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Bad credentials' }),
    } as Response);

    await user.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe('Bad credentials');
    });
  });

  it('should show fallback error on login with json parse failure', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.reject(new Error('parse')),
    } as Response);

    await user.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe('Login failed');
    });
  });

  it('should register successfully', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          user: { id: '1', email: 'test@test.com', name: 'Test' },
          token: 'reg-token',
        }),
    } as Response);

    await user.click(screen.getByText('Register'));

    await waitFor(() => {
      expect(screen.getByTestId('token').textContent).toBe('reg-token');
    });
  });

  it('should show error on register failure', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Email taken' }),
    } as Response);

    await user.click(screen.getByText('Register'));

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe('Email taken');
    });
  });

  it('should show fallback error on register with json parse failure', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.reject(new Error('parse')),
    } as Response);

    await user.click(screen.getByText('Register'));

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe('Registration failed');
    });
  });

  it('should logout and clear state', async () => {
    localStorage.setItem('collab-auth-token', 'token');
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user: { id: '1', email: 'a@b.com', name: 'A' } }),
    } as Response);

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toContain('a@b.com');
    });

    await user.click(screen.getByText('Logout'));

    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(screen.getByTestId('token').textContent).toBe('null');
  });

  it('should throw when useAuth used outside AuthProvider', () => {
    function Orphan() {
      useAuth();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow('useAuth must be used within AuthProvider');
  });
});
