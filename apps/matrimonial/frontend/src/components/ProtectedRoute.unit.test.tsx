import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

const mockUseAuth = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('ProtectedRoute', () => {
  function renderRoute(requireProfile = false) {
    return render(
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route
            path="/private"
            element={(
              <ProtectedRoute requireProfile={requireProfile}>
                <div>Protected content</div>
              </ProtectedRoute>
            )}
          />
          <Route path="/login" element={<div>Login page</div>} />
          <Route path="/build-profile" element={<div>Build profile</div>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it('shows a loading state while auth is resolving', () => {
    mockUseAuth.mockReturnValue({ loading: true, user: null, hasProfile: false });

    renderRoute();

    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('redirects guests to the login page', async () => {
    mockUseAuth.mockReturnValue({ loading: false, user: null, hasProfile: false });

    renderRoute();

    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });

  it('redirects users without a profile when the route requires one', async () => {
    mockUseAuth.mockReturnValue({ loading: false, user: { id: '1' }, hasProfile: false });

    renderRoute(true);

    expect(await screen.findByText('Build profile')).toBeInTheDocument();
  });

  it('renders children when access is allowed', () => {
    mockUseAuth.mockReturnValue({ loading: false, user: { id: '1' }, hasProfile: true });

    renderRoute(true);

    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });
});
