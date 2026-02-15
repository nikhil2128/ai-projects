import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { createUser } from '../../test/factories';
import type { User } from '../../types';

// Mock the API client
vi.mock('../../api/client', () => ({
  getMe: vi.fn(),
}));

import { getMe } from '../../api/client';
const mockGetMe = vi.mocked(getMe);

// ---------- Test component that uses auth ----------

function AuthConsumer() {
  const { user, token, isLoading, login, logout } = useAuth();
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'ready'}</div>
      <div data-testid="user">{user ? user.name : 'none'}</div>
      <div data-testid="token">{token || 'none'}</div>
      <button onClick={() => login('new-token', createUser({ name: 'New User' }))}>
        Login
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

// ---------- Tests ----------

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockGetMe.mockRejectedValue(new Error('No token'));
  });

  describe('initial state', () => {
    it('starts in loading state', () => {
      localStorage.setItem('token', 'pending-token');
      mockGetMe.mockImplementation(() => new Promise(() => {})); // never resolves
      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('loading');
    });

    it('resolves to ready when no token exists', async () => {
      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('none');
      expect(screen.getByTestId('token')).toHaveTextContent('none');
    });

    it('fetches user when token exists in localStorage', async () => {
      const user = createUser({ name: 'Saved User' });
      localStorage.setItem('token', 'saved-token');
      mockGetMe.mockResolvedValue(user);

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('Saved User');
      expect(mockGetMe).toHaveBeenCalledTimes(1);
    });

    it('clears token and user when getMe fails', async () => {
      localStorage.setItem('token', 'invalid-token');
      mockGetMe.mockRejectedValue(new Error('Unauthorized'));

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('none');
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('login', () => {
    it('sets user, token, and persists token to localStorage', async () => {
      const user = userEvent.setup();
      // Mock getMe to return the user that will be set by login
      // After login sets the token, the useEffect will call getMe
      mockGetMe.mockResolvedValue(createUser({ name: 'New User' }));

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      await user.click(screen.getByText('Login'));

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('New User');
      });
      expect(screen.getByTestId('token')).toHaveTextContent('new-token');
      expect(localStorage.getItem('token')).toBe('new-token');
    });
  });

  describe('logout', () => {
    it('clears user, token, and removes token from localStorage', async () => {
      const user = userEvent.setup();
      localStorage.setItem('token', 'existing-token');
      mockGetMe.mockResolvedValue(createUser({ name: 'Logged In User' }));

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('Logged In User');
      });

      await user.click(screen.getByText('Logout'));

      expect(screen.getByTestId('user')).toHaveTextContent('none');
      expect(screen.getByTestId('token')).toHaveTextContent('none');
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('useAuth outside provider', () => {
    it('throws error when used outside AuthProvider', () => {
      // Suppress the error boundary console output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<AuthConsumer />);
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });
  });
});
