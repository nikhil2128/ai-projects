'use client';

import Link from 'next/link';
import { type PostItem, api } from '@/lib/api';
import EmojiReactions from './EmojiReactions';

interface Props {
  post: PostItem;
}

export default function PostCard({ post }: Props) {
  const filterClass = `filter-${post.filter ?? 'none'}`;
  const imageUrl = api.getImageUrl(post.imageUrl);
  const timeAgo = getTimeAgo(post.createdAt);

  return (
    <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link
          href={`/profile/${post.user.username}`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-500 text-sm font-bold text-white"
        >
          {post.user.username[0].toUpperCase()}
        </Link>
        <div>
          <Link
            href={`/profile/${post.user.username}`}
            className="text-sm font-semibold hover:underline"
          >
            {post.user.username}
          </Link>
          <p className="text-xs text-gray-400">{timeAgo}</p>
        </div>
      </div>

      <div className="relative aspect-square bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={post.caption ?? 'Post image'}
          className={`h-full w-full object-cover ${filterClass}`}
        />
      </div>

      <div className="space-y-2 px-4 py-3">
        <EmojiReactions
          postId={post.id}
          reactionCounts={post.reactionCounts}
          userReactions={post.userReactions}
        />

        {post.caption && (
          <p className="text-sm">
            <Link
              href={`/profile/${post.user.username}`}
              className="mr-1 font-semibold hover:underline"
            >
              {post.user.username}
            </Link>
            {post.caption}
          </p>
        )}

        {post.totalReactions > 0 && (
          <p className="text-xs text-gray-400">
            {post.totalReactions} reaction{post.totalReactions !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </article>
  );
}

function getTimeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000,
  );
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
