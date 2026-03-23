'use client';

import type { VerificationStatus } from '@/lib/api';

interface VerificationBadgeProps {
  status?: VerificationStatus;
  size?: 'sm' | 'md';
}

export default function VerificationBadge({ status, size = 'sm' }: VerificationBadgeProps) {
  if (!status || status === 'pending') return null;

  const sizeClass = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  if (status === 'verified') {
    return (
      <span title="Verified account" className="inline-flex flex-shrink-0">
        <svg
          className={`${sizeClass} text-blue-500`}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    );
  }

  if (status === 'flagged' || status === 'restricted') {
    return (
      <span title="Unverified account" className="inline-flex flex-shrink-0">
        <svg
          className={`${sizeClass} text-gray-400`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </span>
    );
  }

  return null;
}
