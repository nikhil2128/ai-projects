'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, type UserProfile, type PostItem } from '@/lib/api';
import Navbar from '@/components/Navbar';
import PostCard from '@/components/PostCard';

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const [profileData, postsData] = await Promise.all([
        api.users.getProfile(username),
        api.posts.getUserPosts(username),
      ]);
      setProfile(profileData);
      setPosts(postsData);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      loadProfile();
    }
  }, [user, authLoading, router, loadProfile]);

  const handleFollowToggle = async () => {
    if (!profile) return;
    setFollowLoading(true);
    try {
      if (profile.isFollowing) {
        await api.follows.unfollow(username);
        setProfile({
          ...profile,
          isFollowing: false,
          followersCount: profile.followersCount - 1,
        });
      } else {
        await api.follows.follow(username);
        setProfile({
          ...profile,
          isFollowing: true,
          followersCount: profile.followersCount + 1,
        });
      }
    } catch (err) {
      console.error('Failed to toggle follow:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="py-20 text-center text-gray-500">User not found</div>
      </div>
    );
  }

  const isOwnProfile = user?.username === username;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-500 text-2xl font-bold text-white">
              {profile.username[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold">{profile.username}</h1>
                {!isOwnProfile && (
                  <button
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-all ${
                      profile.isFollowing
                        ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:shadow-md'
                    }`}
                  >
                    {followLoading
                      ? '...'
                      : profile.isFollowing
                        ? 'Following'
                        : 'Follow'}
                  </button>
                )}
              </div>
              {profile.displayName && (
                <p className="mt-0.5 text-sm text-gray-600">
                  {profile.displayName}
                </p>
              )}
              {profile.bio && (
                <p className="mt-1 text-sm text-gray-500">{profile.bio}</p>
              )}
            </div>
          </div>

          <div className="mt-5 flex justify-around border-t border-gray-100 pt-4 text-center">
            <div>
              <div className="text-lg font-bold">{profile.postsCount}</div>
              <div className="text-xs text-gray-500">posts</div>
            </div>
            <div>
              <div className="text-lg font-bold">{profile.followersCount}</div>
              <div className="text-xs text-gray-500">followers</div>
            </div>
            <div>
              <div className="text-lg font-bold">{profile.followingCount}</div>
              <div className="text-xs text-gray-500">following</div>
            </div>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center">
            <p className="text-sm text-gray-500">No posts yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
