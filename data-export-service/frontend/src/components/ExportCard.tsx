import type { ExportStatusResponse } from '../types';
import { ExportStatus } from '../types';
import { StatusBadge } from './StatusBadge';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function formatDuration(start: string | null, end: string | null) {
  if (!start) return null;
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const secs = Math.round((e - s) / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  return `${mins}m ${secs % 60}s`;
}

interface Props {
  export_: ExportStatusResponse;
  onRemove: (id: string) => void;
}

export function ExportCard({ export_: exp, onRemove }: Props) {
  const duration = formatDuration(exp.startedAt, exp.completedAt);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <StatusBadge status={exp.status} />
            {duration && (
              <span className="text-xs text-gray-400">{duration}</span>
            )}
          </div>
          <p className="mt-2 truncate font-mono text-xs text-gray-500">
            {exp.id}
          </p>
        </div>
        <button
          onClick={() => onRemove(exp.id)}
          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          title="Remove from list"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-gray-400">Records</span>
          <p className="font-semibold text-gray-800">
            {exp.totalRecords.toLocaleString()}
          </p>
        </div>
        <div>
          <span className="text-gray-400">Pages</span>
          <p className="font-semibold text-gray-800">{exp.pagesProcessed}</p>
        </div>
        <div>
          <span className="text-gray-400">Created</span>
          <p className="text-gray-600">{formatDate(exp.createdAt)}</p>
        </div>
        <div>
          <span className="text-gray-400">Completed</span>
          <p className="text-gray-600">{formatDate(exp.completedAt)}</p>
        </div>
      </div>

      {exp.status === ExportStatus.FAILED && exp.errorMessage && (
        <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          {exp.errorMessage}
        </div>
      )}

      {exp.status === ExportStatus.COMPLETED && exp.downloadUrl && (
        <a
          href={exp.downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3"
            />
          </svg>
          Download CSV
        </a>
      )}

      {(exp.status === ExportStatus.PENDING ||
        exp.status === ExportStatus.PROCESSING) && (
        <div className="mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{
                width:
                  exp.status === ExportStatus.PENDING
                    ? '5%'
                    : `${Math.max(10, Math.min(90, exp.pagesProcessed * 5))}%`,
              }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-400">
            {exp.status === ExportStatus.PENDING
              ? 'Waiting to start...'
              : `Processing page ${exp.pagesProcessed}...`}
          </p>
        </div>
      )}
    </div>
  );
}
