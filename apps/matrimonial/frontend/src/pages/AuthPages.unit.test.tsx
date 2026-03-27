import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';
import Register from './Register';

const mockUseAuth = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('auth pages', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it('toggles the login password field visibility', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ login: vi.fn() });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    const passwordInput = screen.getByPlaceholderText('Enter your password');
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getAllByRole('button')[0]);
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('validates short passwords and surfaces registration failures', async () => {
    const user = userEvent.setup();
    const register = vi.fn().mockRejectedValue(new Error('Registration failed'));
    mockUseAuth.mockReturnValue({ register });

    const { rerender } = render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    await user.type(screen.getByPlaceholderText('First name'), 'Asha');
    await user.type(screen.getByPlaceholderText('Last name'), 'Verma');
    await user.type(screen.getByPlaceholderText('you@example.com'), 'asha@example.com');
    await user.type(screen.getByPlaceholderText('Min. 6 characters'), '12345');
    await user.type(screen.getByPlaceholderText('Re-enter password'), '12345');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(await screen.findByText('Password must be at least 6 characters')).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();

    rerender(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    await user.clear(screen.getByPlaceholderText('First name'));
    await user.clear(screen.getByPlaceholderText('Last name'));
    await user.clear(screen.getByPlaceholderText('you@example.com'));
    await user.clear(screen.getByPlaceholderText('Min. 6 characters'));
    await user.clear(screen.getByPlaceholderText('Re-enter password'));
    await user.type(screen.getByPlaceholderText('First name'), 'Asha');
    await user.type(screen.getByPlaceholderText('Last name'), 'Verma');
    await user.type(screen.getByPlaceholderText('you@example.com'), 'asha@example.com');
    await user.type(screen.getByPlaceholderText('Min. 6 characters'), 'password123');
    await user.type(screen.getByPlaceholderText('Re-enter password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(await screen.findByText('Registration failed')).toBeInTheDocument();
    expect(register).toHaveBeenCalled();
  });
});
