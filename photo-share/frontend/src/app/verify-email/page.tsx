'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refreshVerification } = useAuth();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    api.verification
      .verifyEmail(token)
      .then((res) => {
        if (res.success) {
          setStatus('success');
          setMessage(res.message);
          refreshVerification();
        } else {
          setStatus('error');
          setMessage(res.message);
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Verification failed. Please try again.');
      });
  }, [token, refreshVerification]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">
          {status === 'loading' && (
            <>
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
              <h1 className="text-lg font-semibold text-gray-800">
                Verifying your email...
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                Please wait while we confirm your email address.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-lg font-semibold text-gray-800">
                Email Verified
              </h1>
              <p className="mt-2 text-sm text-gray-500">{message}</p>
              <p className="mt-1 text-sm text-gray-500">
                Your trust score has been updated.
              </p>
              <button
                onClick={() => router.push('/feed')}
                className="mt-6 w-full rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 py-2.5 text-sm font-semibold text-white transition-shadow hover:shadow-md"
              >
                Continue to Feed
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-lg font-semibold text-gray-800">
                Verification Failed
              </h1>
              <p className="mt-2 text-sm text-gray-500">{message}</p>
              <div className="mt-6 space-y-2">
                <Link
                  href="/feed"
                  className="block w-full rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 py-2.5 text-sm font-semibold text-white transition-shadow hover:shadow-md"
                >
                  Go to Feed
                </Link>
                <p className="text-xs text-gray-400">
                  You can request a new verification email from the banner.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
