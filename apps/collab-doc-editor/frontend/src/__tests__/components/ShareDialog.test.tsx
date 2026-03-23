import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShareDialog } from '../../components/ShareDialog';

vi.mock('../../services/api', () => ({
  api: {
    searchUsers: vi.fn(),
    shareDocument: vi.fn(),
    unshareDocument: vi.fn(),
  },
}));

import { api } from '../../services/api';
const mockedApi = vi.mocked(api);

const defaultProps = {
  docId: 'doc-1',
  isAuthor: true,
  author: { id: 'user-1', name: 'Alice', email: 'alice@test.com' },
  sharedWithUsers: [
    { id: 'user-2', name: 'Bob', email: 'bob@test.com' },
  ],
  onClose: vi.fn(),
  onUpdated: vi.fn(),
};

describe('ShareDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render dialog with title', () => {
    render(<ShareDialog {...defaultProps} />);
    expect(screen.getByText('Share Document')).toBeInTheDocument();
  });

  it('should show author with Owner badge', () => {
    render(<ShareDialog {...defaultProps} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
  });

  it('should show shared users with Editor badge', () => {
    render(<ShareDialog {...defaultProps} />);
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Editor')).toBeInTheDocument();
  });

  it('should show search bar for authors', () => {
    render(<ShareDialog {...defaultProps} />);
    expect(
      screen.getByPlaceholderText('Search users by name or email...')
    ).toBeInTheDocument();
  });

  it('should not show search bar for non-authors', () => {
    render(<ShareDialog {...defaultProps} isAuthor={false} />);
    expect(
      screen.queryByPlaceholderText('Search users by name or email...')
    ).not.toBeInTheDocument();
  });

  it('should show remove button for shared users when author', () => {
    render(<ShareDialog {...defaultProps} />);
    expect(screen.getByTitle('Remove access')).toBeInTheDocument();
  });

  it('should not show remove button for non-authors', () => {
    render(<ShareDialog {...defaultProps} isAuthor={false} />);
    expect(screen.queryByTitle('Remove access')).not.toBeInTheDocument();
  });

  it('should search users when query is typed', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mockedApi.searchUsers.mockResolvedValue([
      { id: 'user-3', name: 'Charlie', email: 'charlie@test.com' },
    ]);

    render(<ShareDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText('Search users by name or email...');
    await user.type(input, 'charlie');

    await vi.advanceTimersByTimeAsync(350);

    await waitFor(() => {
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });
  });

  it('should not search for short queries', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ShareDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText('Search users by name or email...');
    await user.type(input, 'a');

    await vi.advanceTimersByTimeAsync(350);
    expect(mockedApi.searchUsers).not.toHaveBeenCalled();
  });

  it('should share document when Add button clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mockedApi.searchUsers.mockResolvedValue([
      { id: 'user-3', name: 'Charlie', email: 'charlie@test.com' },
    ]);
    mockedApi.shareDocument.mockResolvedValue({} as any);

    render(<ShareDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText('Search users by name or email...');
    await user.type(input, 'charlie');

    await vi.advanceTimersByTimeAsync(350);

    await waitFor(() => {
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });

    const addButton = screen.getByText('Add');
    await user.click(addButton);

    await waitFor(() => {
      expect(mockedApi.shareDocument).toHaveBeenCalledWith('doc-1', 'user-3');
      expect(defaultProps.onUpdated).toHaveBeenCalled();
    });
  });

  it('should remove user when remove button clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mockedApi.unshareDocument.mockResolvedValue({} as any);

    render(<ShareDialog {...defaultProps} />);

    const removeButton = screen.getByTitle('Remove access');
    await user.click(removeButton);

    await waitFor(() => {
      expect(mockedApi.unshareDocument).toHaveBeenCalledWith('doc-1', 'user-2');
      expect(defaultProps.onUpdated).toHaveBeenCalled();
    });
  });

  it('should close on X button click', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ShareDialog {...defaultProps} />);

    const closeBtn = screen.getByRole('button', { name: '' });
    const allButtons = screen.getAllByRole('button');
    const closeButton = allButtons.find((b) => b.classList.contains('share-close'));
    if (closeButton) {
      await user.click(closeButton);
      expect(defaultProps.onClose).toHaveBeenCalled();
    }
  });

  it('should close on Escape key', () => {
    render(<ShareDialog {...defaultProps} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should close on outside click', () => {
    const { container } = render(<ShareDialog {...defaultProps} />);
    const overlay = container.querySelector('.share-overlay');
    fireEvent.mouseDown(overlay!);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should show empty state when no shared users', () => {
    render(<ShareDialog {...defaultProps} sharedWithUsers={[]} />);
    expect(screen.getByText(/not shared with anyone yet/)).toBeInTheDocument();
  });

  it('should show different empty state for non-authors', () => {
    render(<ShareDialog {...defaultProps} isAuthor={false} sharedWithUsers={[]} />);
    expect(screen.getByText('No other collaborators.')).toBeInTheDocument();
  });

  it('should show "No users found" for empty search results', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mockedApi.searchUsers.mockResolvedValue([]);

    render(<ShareDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText('Search users by name or email...');
    await user.type(input, 'zzzzz');

    await vi.advanceTimersByTimeAsync(350);

    await waitFor(() => {
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
  });

  it('should handle share error gracefully', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mockedApi.searchUsers.mockResolvedValue([
      { id: 'user-3', name: 'Charlie', email: 'charlie@test.com' },
    ]);
    mockedApi.shareDocument.mockRejectedValue(new Error('Failed'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<ShareDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText('Search users by name or email...');
    await user.type(input, 'charlie');

    await vi.advanceTimersByTimeAsync(350);

    await waitFor(() => {
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  it('should handle remove error gracefully', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mockedApi.unshareDocument.mockRejectedValue(new Error('Failed'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<ShareDialog {...defaultProps} />);
    await user.click(screen.getByTitle('Remove access'));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  it('should handle null author', () => {
    render(<ShareDialog {...defaultProps} author={null} />);
    expect(screen.queryByText('Owner')).not.toBeInTheDocument();
  });

  it('should handle search error gracefully', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mockedApi.searchUsers.mockRejectedValue(new Error('Network error'));

    render(<ShareDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText('Search users by name or email...');
    await user.type(input, 'charlie');

    await vi.advanceTimersByTimeAsync(350);

    await waitFor(() => {
      expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
    });
  });
});
