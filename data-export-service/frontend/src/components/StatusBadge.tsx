import { ExportStatus } from '../types';

const config: Record<
  ExportStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  [ExportStatus.PENDING]: {
    label: 'Pending',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-400',
  },
  [ExportStatus.PROCESSING]: {
    label: 'Processing',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-400',
  },
  [ExportStatus.COMPLETED]: {
    label: 'Completed',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-400',
  },
  [ExportStatus.FAILED]: {
    label: 'Failed',
    bg: 'bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-400',
  },
};

export function StatusBadge({ status }: { status: ExportStatus }) {
  const c = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${c.dot} ${status === ExportStatus.PROCESSING ? 'animate-pulse' : ''}`}
      />
      {c.label}
    </span>
  );
}
