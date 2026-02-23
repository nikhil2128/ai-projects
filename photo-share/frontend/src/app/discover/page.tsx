'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api, type NearbyUser } from '@/lib/api';
import Navbar from '@/components/Navbar';

type LocationState = 'idle' | 'requesting' | 'granted' | 'denied' | 'error';

const RADIUS_OPTIONS = [5, 10, 25, 50, 100, 250];

export default function DiscoverPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [locationState, setLocationState] = useState<LocationState>('idle');
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [radius, setRadius] = useState(50);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<number>>(new Set());

  const fetchNearby = useCallback(
    async (r: number, p: number) => {
      setLoading(true);
      try {
        const res = await api.recommendations.nearby(r, p);
        setNearbyUsers(res.users);
        setTotalPages(res.totalPages);
        setTotal(res.total);
        setFollowingIds(
          new Set(res.users.filter((u) => u.isFollowing).map((u) => u.id)),
        );
      } catch (err) {
        console.error('Failed to fetch nearby users:', err);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setLocationState('error');
      return;
    }
    setLocationState('requesting');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await api.users.updateLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationState('granted');
          fetchNearby(radius, 1);
        } catch {
          setLocationState('error');
        }
      },
      () => setLocationState('denied'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [radius, fetchNearby]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (locationState === 'granted') {
      fetchNearby(radius, page);
    }
  }, [radius, page, locationState, fetchNearby]);

  // Optimistic follow/unfollow
  const handleFollow = async (username: string, userId: number) => {
    const isCurrentlyFollowing = followingIds.has(userId);

    // Optimistic update
    setFollowingIds((prev) => {
      const next = new Set(prev);
      if (isCurrentlyFollowing) next.delete(userId);
      else next.add(userId);
      return next;
    });

    try {
      if (isCurrentlyFollowing) {
        await api.follows.unfollow(username);
      } else {
        await api.follows.follow(username);
      }
    } catch (err) {
      // Revert on failure
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlyFollowing) next.add(userId);
        else next.delete(userId);
        return next;
      });
      console.error('Follow/unfollow failed:', err);
    }
  };

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
      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Discover Nearby</h1>
          <p className="mt-1 text-sm text-gray-500">
            Find and follow people near you. Build your network with locals who
            share your world.
          </p>
        </div>

        {locationState === 'idle' || locationState === 'denied' || locationState === 'error' ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-purple-100">
              <svg
                className="h-10 w-10 text-pink-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-lg font-semibold text-gray-800">
              {locationState === 'denied'
                ? 'Location Access Denied'
                : locationState === 'error'
                  ? 'Something Went Wrong'
                  : 'Enable Location'}
            </h2>
            <p className="mx-auto mb-6 max-w-sm text-sm text-gray-500">
              {locationState === 'denied'
                ? 'Please enable location permissions in your browser settings to discover nearby users.'
                : locationState === 'error'
                  ? 'We could not retrieve your location. Please try again.'
                  : 'Share your location to discover people nearby. Connect with locals, find friends, and build your community effortlessly.'}
            </p>
            <button
              onClick={requestLocation}
              className="rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 px-8 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:brightness-105"
            >
              {locationState === 'denied' || locationState === 'error'
                ? 'Try Again'
                : 'Share My Location'}
            </button>
          </div>
        ) : locationState === 'requesting' ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-16">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
            <p className="text-sm text-gray-500">Getting your location...</p>
          </div>
        ) : (
          <>
            {/* Radius selector */}
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Radius:</span>
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRadius(r);
                    setPage(1);
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    radius === r
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {r} km
                </button>
              ))}
              <span className="ml-auto text-xs text-gray-400">
                {total} {total === 1 ? 'person' : 'people'} nearby
              </span>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
              </div>
            ) : nearbyUsers.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center">
                <div className="mb-4 text-5xl">🌍</div>
                <h2 className="mb-2 text-lg font-semibold text-gray-800">
                  No one nearby yet
                </h2>
                <p className="text-sm text-gray-500">
                  Try expanding your search radius or check back later as more
                  people join.
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  {nearbyUsers.map((u) => (
                    <NearbyUserCard
                      key={u.id}
                      user={u}
                      isFollowing={followingIds.has(u.id)}
                      onFollow={() => handleFollow(u.username, u.id)}
                    />
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
          </>
        )}
      </main>
    </div>
  );
}

function NearbyUserCard({
  user,
  isFollowing,
  onFollow,
}: {
  user: NearbyUser;
  isFollowing: boolean;
  onFollow: () => void;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        <Link href={`/profile/${user.username}`}>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-purple-500 text-lg font-bold text-white ring-2 ring-white">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={api.getImageUrl(user.avatarUrl)}
                alt={user.username}
                className="h-full w-full rounded-full object-cover"
                loading="lazy"
              />
            ) : (
              user.username[0].toUpperCase()
            )}
          </div>
        </Link>

        <div className="min-w-0 flex-1">
          <Link href={`/profile/${user.username}`}>
            <h3 className="truncate font-semibold text-gray-900 hover:underline">
              {user.displayName ?? user.username}
            </h3>
            <p className="truncate text-sm text-gray-500">@{user.username}</p>
          </Link>

          {user.bio && (
            <p className="mt-1 line-clamp-2 text-xs text-gray-500">{user.bio}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-2 py-0.5 text-xs font-medium text-pink-600">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              {user.distance < 1
                ? '< 1 km away'
                : `${user.distance} km away`}
            </span>

            {user.mutualConnections > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-600">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                {user.mutualConnections} mutual{user.mutualConnections !== 1 ? 's' : ''}
              </span>
            )}

            {user.locationName && (
              <span className="truncate text-xs text-gray-400">
                {user.locationName}
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={onFollow}
        className={`mt-4 w-full rounded-xl py-2 text-sm font-semibold transition-all ${
          isFollowing
            ? 'border border-gray-200 bg-white text-gray-600 hover:border-red-200 hover:bg-red-50 hover:text-red-500'
            : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-sm hover:shadow-md hover:brightness-105'
        }`}
      >
        {isFollowing ? 'Following' : 'Follow'}
      </button>
    </div>
  );
}
