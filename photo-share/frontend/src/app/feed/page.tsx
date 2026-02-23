'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, type PostItem } from '@/lib/api';
import Navbar from '@/components/Navbar';
import PostCard from '@/components/PostCard';

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadFeed = useCallback(async (cursorVal?: string) => {
    const isInitial = !cursorVal;
    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await api.posts.getFeedCursor(cursorVal);
      setPosts((prev) => (isInitial ? res.posts : [...prev, ...res.posts]));
      setCursor(res.nextCursor ?? undefined);
      setHasMore(res.hasMore);
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      loadFeed();
    }
  }, [user, authLoading, router, loadFeed]);

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && cursor) {
          loadFeed(cursor);
        }
      },
      { rootMargin: '400px' },
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, cursor, loadFeed]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-lg px-4 py-6">
        {user?.verificationStatus === 'pending_review' && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Your profile is being verified automatically. You can browse the app now, and posting/following unlocks once verification completes.
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center">
            <div className="mb-4 text-5xl">📷</div>
            <h2 className="mb-2 text-lg font-semibold text-gray-800">
              Your feed is empty
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              Follow other users or create your first post to see content here.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => router.push('/discover')}
                className="rounded-lg border border-pink-200 bg-pink-50 px-6 py-2 text-sm font-medium text-pink-600 transition-colors hover:bg-pink-100"
              >
                Discover Nearby People
              </button>
              <button
                onClick={() => router.push('/create')}
                className="rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-2 text-sm font-medium text-white"
              >
                Create a Post
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-4" />

            {loadingMore && (
              <div className="flex justify-center py-6">
                <div className="h-6 w-6 animate-spin rounded-full border-3 border-pink-500 border-t-transparent" />
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <p className="py-8 text-center text-sm text-gray-400">
                You&apos;re all caught up!
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
