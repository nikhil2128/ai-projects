'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, type AuthUser } from '@/lib/api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AuthUser[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await api.users.search(q);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link
          href="/feed"
          className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-xl font-bold text-transparent"
        >
          PhotoShare
        </Link>

        <div className="relative">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setShowSearch(true)}
            onBlur={() => setTimeout(() => setShowSearch(false), 200)}
            className="w-48 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm outline-none transition-all focus:w-64 focus:border-pink-300 focus:bg-white focus:ring-2 focus:ring-pink-100 md:w-64"
          />
          {showSearch && searchResults.length > 0 && (
            <div className="absolute top-full mt-1 w-full rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    router.push(`/profile/${u.username}`);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-purple-500 text-xs font-bold text-white">
                    {u.username[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{u.username}</div>
                    {u.displayName && (
                      <div className="text-xs text-gray-500">{u.displayName}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/discover"
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-pink-300 hover:text-pink-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            Discover
          </Link>
          <Link
            href="/create"
            className="rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 px-3 py-1.5 text-sm font-medium text-white transition-shadow hover:shadow-md"
          >
            + New Post
          </Link>
          {user && (
            <Link
              href={`/profile/${user.username}`}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-purple-500 text-xs font-bold text-white"
            >
              {user.username[0].toUpperCase()}
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
