import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmojiReactions from './EmojiReactions';
import { api } from '@/lib/api';

jest.mock('@/lib/api', () => ({
  api: {
    reactions: {
      toggle: jest.fn(),
    },
  },
}));

describe('EmojiReactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds an emoji reaction from picker', async () => {
    (api.reactions.toggle as jest.Mock).mockResolvedValue({ action: 'added', emoji: '🔥' });
    const user = userEvent.setup();

    render(<EmojiReactions postId={1} reactionCounts={{}} userReactions={[]} />);

    await user.click(screen.getByTitle('Add reaction'));
    await user.click(screen.getByRole('button', { name: '🔥' }));

    await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument());
  });

  it('removes active reaction when toggled again', async () => {
    (api.reactions.toggle as jest.Mock).mockResolvedValue({
      action: 'removed',
      emoji: '❤️',
    });
    const user = userEvent.setup();

    render(<EmojiReactions postId={1} reactionCounts={{ '❤️': 1 }} userReactions={['❤️']} />);

    await user.click(screen.getByRole('button', { name: /❤️/ }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /❤️/ })).not.toBeInTheDocument(),
    );
  });

  it('decrements reaction count without removing emoji when count stays positive', async () => {
    (api.reactions.toggle as jest.Mock).mockResolvedValue({
      action: 'removed',
      emoji: '🔥',
    });
    const user = userEvent.setup();

    render(<EmojiReactions postId={1} reactionCounts={{ '🔥': 2 }} userReactions={['🔥']} />);
    await user.click(screen.getByRole('button', { name: /🔥/ }));

    await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument());
  });

  it('marks already-selected emojis inside picker', async () => {
    const user = userEvent.setup();
    render(<EmojiReactions postId={1} reactionCounts={{ '🔥': 1 }} userReactions={['🔥']} />);

    await user.click(screen.getByTitle('Add reaction'));
    const fireButton = screen
      .getAllByText('🔥')
      .map((node) => node.closest('button'))
      .find((button) => button?.className.includes('text-lg'));

    expect(fireButton).toBeTruthy();
    expect(fireButton?.className).toContain('bg-pink-50');
  });

  it('keeps UI stable when toggle request fails', async () => {
    (api.reactions.toggle as jest.Mock).mockRejectedValue(new Error('fail'));
    const user = userEvent.setup();

    render(<EmojiReactions postId={2} reactionCounts={{ '😂': 2 }} userReactions={[]} />);
    await user.click(screen.getByRole('button', { name: /😂/ }));

    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
