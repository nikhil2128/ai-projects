import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';

// Mock AuthContext to avoid actual API calls
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('App', () => {
  it('redirects unauthenticated users to login', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // When not authenticated, should show the login page
    expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument();
  });
});
