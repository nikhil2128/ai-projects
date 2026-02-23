'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

export default function VerificationBanner() {
  const { verification, refreshVerification } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [rechecking, setRechecking] = useState(false);

  if (dismissed || !verification) return null;
  if (verification.status === 'verified') return null;

  const handleSendEmail = async () => {
    setSendingEmail(true);
    try {
      await api.verification.sendVerificationEmail();
      setEmailSent(true);
    } catch {
      // Silently fail
    } finally {
      setSendingEmail(false);
    }
  };

  const handleRecheck = async () => {
    setRechecking(true);
    try {
      await api.verification.recheck();
      setTimeout(async () => {
        await refreshVerification();
        setRechecking(false);
      }, 3000);
    } catch {
      setRechecking(false);
    }
  };

  const isFlagged = verification.status === 'flagged' || verification.status === 'restricted';
  const pendingActions = verification.pendingActions ?? [];
  const needsEmail = pendingActions.includes('verify_email');
  const needsProfile = pendingActions.includes('complete_profile');
  const progress = Math.min(100, verification.score);

  return (
    <div
      className={`border-b px-4 py-3 ${
        isFlagged
          ? 'border-red-200 bg-red-50'
          : 'border-amber-200 bg-amber-50'
      }`}
    >
      <div className="mx-auto flex max-w-4xl items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800">
              {isFlagged
                ? 'Account requires verification'
                : 'Complete your verification'}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                isFlagged
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {verification.status}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-3">
            <div className="h-1.5 flex-1 rounded-full bg-gray-200">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  progress >= 60
                    ? 'bg-green-500'
                    : progress >= 30
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{progress}/100</span>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {needsEmail && !emailSent && (
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail}
                className="rounded-md bg-white px-3 py-1 text-xs font-medium text-amber-700 shadow-sm ring-1 ring-amber-200 transition-colors hover:bg-amber-50 disabled:opacity-50"
              >
                {sendingEmail ? 'Sending...' : 'Verify email'}
              </button>
            )}
            {emailSent && (
              <span className="rounded-md bg-green-50 px-3 py-1 text-xs font-medium text-green-700 ring-1 ring-green-200">
                Check your inbox
              </span>
            )}
            {needsProfile && (
              <a
                href={`/profile/settings`}
                className="rounded-md bg-white px-3 py-1 text-xs font-medium text-amber-700 shadow-sm ring-1 ring-amber-200 transition-colors hover:bg-amber-50"
              >
                Complete profile
              </a>
            )}
            {!needsEmail && !needsProfile && verification.status === 'pending' && (
              <button
                onClick={handleRecheck}
                disabled={rechecking}
                className="rounded-md bg-white px-3 py-1 text-xs font-medium text-amber-700 shadow-sm ring-1 ring-amber-200 transition-colors hover:bg-amber-50 disabled:opacity-50"
              >
                {rechecking ? 'Checking...' : 'Re-check status'}
              </button>
            )}
          </div>
        </div>

        {!isFlagged && (
          <button
            onClick={() => setDismissed(true)}
            className="mt-0.5 text-gray-400 transition-colors hover:text-gray-600"
            aria-label="Dismiss"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
