import { memo } from 'react';
import type { InvoiceStatusResponse } from '../../types/invoice';
import { InvoiceStatus } from '../../types/invoice';
import { StatusBadge } from '../ui/StatusBadge';

interface InvoiceStatusTrackerProps {
  statuses: Map<string, InvoiceStatusResponse>;
  onDismiss: () => void;
}

export const InvoiceStatusTracker = memo(function InvoiceStatusTracker({
  statuses,
  onDismiss,
}: InvoiceStatusTrackerProps) {
  if (statuses.size === 0) return null;

  const entries = Array.from(statuses.values());
  const completedCount = entries.filter(
    (s) => s.status === InvoiceStatus.COMPLETED,
  ).length;
  const failedCount = entries.filter(
    (s) => s.status === InvoiceStatus.FAILED,
  ).length;
  const processingCount = entries.filter(
    (s) =>
      s.status === InvoiceStatus.PROCESSING ||
      s.status === InvoiceStatus.PENDING,
  ).length;

  const allDone = processingCount === 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm animate-slide-up">
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            Processing Status
          </h2>
          {allDone && (
            <button
              onClick={onDismiss}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              Dismiss
            </button>
          )}
        </div>

        {/* Summary Bar */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-gray-600">{completedCount} completed</span>
          </div>
          {failedCount > 0 && (
            <div className="flex items-center gap-1.5 text-sm">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-gray-600">{failedCount} failed</span>
            </div>
          )}
          {processingCount > 0 && (
            <div className="flex items-center gap-1.5 text-sm">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-gray-600">{processingCount} in progress</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {entries.length > 0 && (
          <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                failedCount > 0 && allDone
                  ? 'bg-yellow-500'
                  : allDone
                    ? 'bg-green-500'
                    : 'bg-primary-600'
              }`}
              style={{
                width: `${((completedCount + failedCount) / entries.length) * 100}%`,
              }}
            />
          </div>
        )}

        {/* Individual Status Items */}
        <div className="max-h-48 overflow-y-auto space-y-2">
          {entries.map((status) => (
            <div
              key={status.id}
              className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg"
            >
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {status.originalFilename}
                </p>
                {status.status === InvoiceStatus.COMPLETED && (
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    {status.vendorName && (
                      <span className="text-xs text-gray-500">
                        {status.vendorName}
                      </span>
                    )}
                    {status.amount !== null && (
                      <span className="text-xs text-gray-500">
                        ${status.amount.toLocaleString()}
                      </span>
                    )}
                  </div>
                )}
                {status.status === InvoiceStatus.FAILED && status.errorMessage && (
                  <p className="text-xs text-red-500 mt-0.5 truncate">
                    {status.errorMessage}
                  </p>
                )}
              </div>
              <StatusBadge status={status.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
