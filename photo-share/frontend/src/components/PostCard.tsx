'use client';

import { useState } from 'react';
import Link from 'next/link';
import { type PostItem, api } from '@/lib/api';
import EmojiReactions from './EmojiReactions';

interface Props {
  post: PostItem;
}

export default function PostCard({ post }: Props) {
  const filterClass = `filter-${post.filter ?? 'none'}`;
  const thumbnailUrl = post.thumbnailUrl
    ? api.getImageUrl(post.thumbnailUrl)
    : api.getImageUrl(post.imageUrl);
  const fullImageUrl = api.getImageUrl(post.imageUrl);
  const timeAgo = getTimeAgo(post.createdAt);
  const [imgSrc, setImgSrc] = useState(thumbnailUrl);
  const [loaded, setLoaded] = useState(false);

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
        {!loaded && (
          <div className="absolute inset-0 animate-pulse bg-gray-200" />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={post.caption ?? 'Post image'}
          className={`h-full w-full object-cover transition-opacity duration-300 ${filterClass} ${loaded ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
          decoding="async"
          onLoad={() => {
            setLoaded(true);
            // Progressive: load full-res after thumbnail
            if (imgSrc === thumbnailUrl && thumbnailUrl !== fullImageUrl) {
              const img = new Image();
              img.onload = () => setImgSrc(fullImageUrl);
              img.src = fullImageUrl;
            }
          }}
          onError={() => {
            if (imgSrc !== fullImageUrl) setImgSrc(fullImageUrl);
          }}
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
