'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      router.push('/feed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="mb-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-center text-3xl font-bold text-transparent">
            PhotoShare
          </h1>
          <p className="mb-6 text-center text-sm text-gray-500">
            Share your moments with the world
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-pink-300 focus:bg-white focus:ring-2 focus:ring-pink-100"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-pink-300 focus:bg-white focus:ring-2 focus:ring-pink-100"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 py-2.5 text-sm font-semibold text-white transition-shadow hover:shadow-md disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 text-center shadow-sm">
          <p className="text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="font-semibold text-pink-500 hover:text-pink-600"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
