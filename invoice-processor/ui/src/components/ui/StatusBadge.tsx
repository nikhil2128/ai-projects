import { memo } from 'react';
import { InvoiceStatus } from '../../types/invoice';
import { LoadingSpinner } from './LoadingSpinner';

interface StatusBadgeProps {
  status: InvoiceStatus;
}

const statusConfig: Record<
  InvoiceStatus,
  { label: string; bgClass: string; textClass: string; dotClass: string }
> = {
  [InvoiceStatus.PENDING]: {
    label: 'Pending',
    bgClass: 'bg-yellow-50',
    textClass: 'text-yellow-700',
    dotClass: 'bg-yellow-400',
  },
  [InvoiceStatus.PROCESSING]: {
    label: 'Processing',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    dotClass: 'bg-blue-400',
  },
  [InvoiceStatus.COMPLETED]: {
    label: 'Completed',
    bgClass: 'bg-green-50',
    textClass: 'text-green-700',
    dotClass: 'bg-green-400',
  },
  [InvoiceStatus.FAILED]: {
    label: 'Failed',
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    dotClass: 'bg-red-400',
  },
};

export const StatusBadge = memo(function StatusBadge({
  status,
}: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgClass} ${config.textClass}`}
    >
      {status === InvoiceStatus.PROCESSING ? (
        <LoadingSpinner size="sm" className="!w-3 !h-3" />
      ) : (
        <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
      )}
      {config.label}
    </span>
  );
});
