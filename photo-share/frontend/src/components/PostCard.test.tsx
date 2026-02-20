import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import PostCard from './PostCard';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock('./EmojiReactions', () => ({
  __esModule: true,
  default: () => <div data-testid="emoji-reactions" />,
}));

describe('PostCard', () => {
  it('renders user info, caption and reaction count', () => {
    render(
      <PostCard
        post={{
          id: 1,
          imageUrl: '/uploads/a.png',
          caption: 'great shot',
          filter: 'sepia',
          userId: 2,
          user: { id: 2, username: 'bob', email: 'bob@example.com' },
          reactionCounts: { '🔥': 2 },
          userReactions: ['🔥'],
          totalReactions: 2,
          createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        }}
      />,
    );

    expect(screen.getAllByText('bob').length).toBeGreaterThan(0);
    expect(screen.getByText('great shot')).toBeInTheDocument();
    expect(screen.getByText('2 reactions')).toBeInTheDocument();
    expect(screen.getByTestId('emoji-reactions')).toBeInTheDocument();
  });

  it('falls back to image alt text and hides reaction line when empty', () => {
    render(
      <PostCard
        post={{
          id: 2,
          imageUrl: '/uploads/b.png',
          caption: undefined as unknown as string,
          filter: 'none',
          userId: 3,
          user: { id: 3, username: 'amy', email: 'amy@example.com' },
          reactionCounts: {},
          userReactions: [],
          totalReactions: 0,
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        }}
      />,
    );

    expect(screen.getByAltText('Post image')).toBeInTheDocument();
    expect(screen.queryByText(/reaction/)).not.toBeInTheDocument();
  });

  it('renders singular reaction text and recent timestamps', () => {
    render(
      <PostCard
        post={{
          id: 3,
          imageUrl: '/uploads/c.png',
          caption: 'quick post',
          filter: 'none',
          userId: 4,
          user: { id: 4, username: 'zoe', email: 'zoe@example.com' },
          reactionCounts: { '😂': 1 },
          userReactions: [],
          totalReactions: 1,
          createdAt: new Date(Date.now() - 10 * 1000).toISOString(),
        }}
      />,
    );

    expect(screen.getByText('1 reaction')).toBeInTheDocument();
    expect(screen.getByText('just now')).toBeInTheDocument();
  });

  it('renders hour and day based timestamps', () => {
    const { rerender } = render(
      <PostCard
        post={{
          id: 4,
          imageUrl: '/uploads/d.png',
          caption: 'hour old',
          filter: 'none',
          userId: 4,
          user: { id: 4, username: 'zoe', email: 'zoe@example.com' },
          reactionCounts: {},
          userReactions: [],
          totalReactions: 0,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        }}
      />,
    );
    expect(screen.getByText('2h ago')).toBeInTheDocument();

    rerender(
      <PostCard
        post={{
          id: 5,
          imageUrl: '/uploads/e.png',
          caption: 'day old',
          filter: 'none',
          userId: 4,
          user: { id: 4, username: 'zoe', email: 'zoe@example.com' },
          reactionCounts: {},
          userReactions: [],
          totalReactions: 0,
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        }}
      />,
    );
    expect(screen.getByText('3d ago')).toBeInTheDocument();
  });
});
