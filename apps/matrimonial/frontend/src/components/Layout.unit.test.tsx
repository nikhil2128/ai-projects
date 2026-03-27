import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Layout from './Layout';
import { sampleProfile } from '../test/fixtures';

const mockUseAuth = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('Layout', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it('renders navigation, user identity, and logout actions', async () => {
    const user = userEvent.setup();
    const logout = vi.fn();
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: sampleProfile,
      logout,
    });

    render(
      <MemoryRouter initialEntries={['/browse']}>
        <Layout>
          <div>Page content</div>
        </Layout>
      </MemoryRouter>,
    );

    expect(screen.getAllByText('SoulMatch').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Browse').length).toBeGreaterThan(0);
    expect(screen.getByText('Asha')).toBeInTheDocument();
    expect(screen.getByText('Page content')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /logout/i })[0]);
    expect(logout).toHaveBeenCalled();
  });

  it('supports users without a profile photo and toggles the mobile menu', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: { ...sampleProfile, photoUrl: '' },
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/shortlist']}>
        <Layout>
          <div>Shortlist page</div>
        </Layout>
      </MemoryRouter>,
    );

    await user.click(screen.getAllByRole('button')[1]);

    expect(screen.getAllByText('Shortlist').length).toBeGreaterThan(0);
  });
});
