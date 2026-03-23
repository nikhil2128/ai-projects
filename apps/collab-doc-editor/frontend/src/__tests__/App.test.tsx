import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

let mockAuthState = {
  user: null as any,
  token: null as string | null,
  loading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

vi.mock('../pages/HomePage', () => ({
  HomePage: () => <div data-testid="home-page">Home Page</div>,
}));

vi.mock('../pages/EditorPage', () => ({
  EditorPage: () => <div data-testid="editor-page">Editor Page</div>,
}));

vi.mock('../pages/LoginPage', () => ({
  LoginPage: () => <div data-testid="login-page">Login Page</div>,
}));

vi.mock('../pages/RegisterPage', () => ({
  RegisterPage: () => <div data-testid="register-page">Register Page</div>,
}));

import { App } from '../App';

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = {
      user: null,
      token: null,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    };
  });

  it('should show loading state', () => {
    mockAuthState.loading = true;
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should redirect to login when not authenticated and accessing protected route', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });

  it('should show login page for unauthenticated users', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  it('should show register page for unauthenticated users', () => {
    render(
      <MemoryRouter initialEntries={['/register']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByTestId('register-page')).toBeInTheDocument();
  });

  it('should show home page for authenticated users', () => {
    mockAuthState.user = { id: '1', name: 'Test', email: 'test@test.com' };
    mockAuthState.token = 'token';
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
  });

  it('should redirect authenticated users from login to home', () => {
    mockAuthState.user = { id: '1', name: 'Test', email: 'test@test.com' };
    mockAuthState.token = 'token';
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
  });

  it('should redirect authenticated users from register to home', () => {
    mockAuthState.user = { id: '1', name: 'Test', email: 'test@test.com' };
    mockAuthState.token = 'token';
    render(
      <MemoryRouter initialEntries={['/register']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
  });

  it('should show editor page for authenticated users', () => {
    mockAuthState.user = { id: '1', name: 'Test', email: 'test@test.com' };
    mockAuthState.token = 'token';
    render(
      <MemoryRouter initialEntries={['/doc/doc-1']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByTestId('editor-page')).toBeInTheDocument();
  });
});
