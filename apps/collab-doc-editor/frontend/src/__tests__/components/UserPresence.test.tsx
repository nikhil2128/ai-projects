import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserPresence } from '../../components/UserPresence';

const mockUsers = [
  { name: 'Alice', color: '#FF6B6B', clientId: 1 },
  { name: 'Bob', color: '#4ECDC4', clientId: 2 },
  { name: 'Charlie', color: '#45B7D1', clientId: 3 },
];

const mockCurrentUser = { name: 'Alice', color: '#FF6B6B' };

describe('UserPresence', () => {
  it('should render connected user count', () => {
    render(
      <UserPresence
        connectedUsers={mockUsers}
        currentUser={mockCurrentUser}
        onNameChange={vi.fn()}
      />
    );
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should render avatar stack', () => {
    const { container } = render(
      <UserPresence
        connectedUsers={mockUsers}
        currentUser={mockCurrentUser}
        onNameChange={vi.fn()}
      />
    );
    const avatars = container.querySelectorAll('.avatar');
    expect(avatars.length).toBe(3);
  });

  it('should show overflow indicator when more than 5 users', () => {
    const manyUsers = Array.from({ length: 7 }, (_, i) => ({
      name: `User ${i}`,
      color: '#FF6B6B',
      clientId: i,
    }));

    render(
      <UserPresence
        connectedUsers={manyUsers}
        currentUser={mockCurrentUser}
        onNameChange={vi.fn()}
      />
    );
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('should toggle panel on button click', async () => {
    const user = userEvent.setup();
    render(
      <UserPresence
        connectedUsers={mockUsers}
        currentUser={mockCurrentUser}
        onNameChange={vi.fn()}
      />
    );

    const trigger = screen.getByTitle('3 user(s) connected');
    await user.click(trigger);
    expect(screen.getByText('Connected Users (3)')).toBeInTheDocument();
  });

  it('should show current user with You badge', async () => {
    const user = userEvent.setup();
    render(
      <UserPresence
        connectedUsers={mockUsers}
        currentUser={mockCurrentUser}
        onNameChange={vi.fn()}
      />
    );

    await user.click(screen.getByTitle('3 user(s) connected'));
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('should filter out current user from other users list', async () => {
    const user = userEvent.setup();
    render(
      <UserPresence
        connectedUsers={mockUsers}
        currentUser={mockCurrentUser}
        onNameChange={vi.fn()}
      />
    );

    await user.click(screen.getByTitle('3 user(s) connected'));
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('should enable name editing', async () => {
    const user = userEvent.setup();
    render(
      <UserPresence
        connectedUsers={mockUsers}
        currentUser={mockCurrentUser}
        onNameChange={vi.fn()}
      />
    );

    await user.click(screen.getByTitle('3 user(s) connected'));
    const editButton = screen.getByText('You').parentElement!.querySelector('button');
    await user.click(editButton!);

    const input = screen.getByDisplayValue('Alice');
    expect(input).toBeInTheDocument();
  });

  it('should save name on Enter', async () => {
    const onNameChange = vi.fn();
    const user = userEvent.setup();
    render(
      <UserPresence
        connectedUsers={mockUsers}
        currentUser={mockCurrentUser}
        onNameChange={onNameChange}
      />
    );

    await user.click(screen.getByTitle('3 user(s) connected'));
    const editButton = screen.getByText('You').parentElement!.querySelector('button');
    await user.click(editButton!);

    const input = screen.getByDisplayValue('Alice');
    await user.clear(input);
    await user.type(input, 'New Name{Enter}');

    expect(onNameChange).toHaveBeenCalledWith('New Name');
  });

  it('should cancel editing on Escape', async () => {
    const user = userEvent.setup();
    render(
      <UserPresence
        connectedUsers={mockUsers}
        currentUser={mockCurrentUser}
        onNameChange={vi.fn()}
      />
    );

    await user.click(screen.getByTitle('3 user(s) connected'));
    const editButton = screen.getByText('You').parentElement!.querySelector('button');
    await user.click(editButton!);

    const input = screen.getByDisplayValue('Alice');
    await user.type(input, '{Escape}');

    expect(screen.queryByDisplayValue('Alice')).not.toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('should save name on check button click', async () => {
    const onNameChange = vi.fn();
    const user = userEvent.setup();
    render(
      <UserPresence
        connectedUsers={mockUsers}
        currentUser={mockCurrentUser}
        onNameChange={onNameChange}
      />
    );

    await user.click(screen.getByTitle('3 user(s) connected'));
    const editButton = screen.getByText('You').parentElement!.querySelector('button');
    await user.click(editButton!);

    const nameEditDiv = screen.getByDisplayValue('Alice').closest('.name-edit');
    const saveButton = nameEditDiv!.querySelector('button');
    await user.click(saveButton!);

    expect(onNameChange).toHaveBeenCalledWith('Alice');
  });

  it('should not save empty name', async () => {
    const onNameChange = vi.fn();
    const user = userEvent.setup();
    render(
      <UserPresence
        connectedUsers={mockUsers}
        currentUser={mockCurrentUser}
        onNameChange={onNameChange}
      />
    );

    await user.click(screen.getByTitle('3 user(s) connected'));
    const editButton = screen.getByText('You').parentElement!.querySelector('button');
    await user.click(editButton!);

    const input = screen.getByDisplayValue('Alice');
    await user.clear(input);

    const nameEditDiv = input.closest('.name-edit');
    const saveButton = nameEditDiv!.querySelector('button');
    await user.click(saveButton!);

    expect(onNameChange).not.toHaveBeenCalled();
  });

  it('should close panel on outside click', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <UserPresence
          connectedUsers={mockUsers}
          currentUser={mockCurrentUser}
          onNameChange={vi.fn()}
        />
      </div>
    );

    await user.click(screen.getByTitle('3 user(s) connected'));
    expect(screen.getByText('Connected Users (3)')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByText('Connected Users (3)')).not.toBeInTheDocument();
  });
});
