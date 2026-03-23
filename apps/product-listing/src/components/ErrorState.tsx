import { memo } from "react";

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export const ErrorState = memo(function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Something went wrong</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-sm">{message}</p>
      <button
        onClick={onRetry}
        className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
      >
        Try again
      </button>
    </div>
  );
});
