'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, type PostItem } from '@/lib/api';
import Navbar from '@/components/Navbar';
import PostCard from '@/components/PostCard';

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadFeed = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await api.posts.getFeed(p);
      setPosts(res.posts);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      loadFeed(page);
    }
  }, [user, authLoading, page, router, loadFeed]);

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

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm transition-colors hover:bg-gray-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="px-3 text-sm text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm transition-colors hover:bg-gray-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
