import { useExports } from './hooks/useExports';
import { CreateExportForm } from './components/CreateExportForm';
import { ExportList } from './components/ExportList';
import { ExportStatus } from './types';

export default function App() {
  const { exports, loading, creating, error, createExport, removeExport, refresh } =
    useExports();

  const counts = {
    total: exports.length,
    active: exports.filter(
      (e) =>
        e.status === ExportStatus.PENDING ||
        e.status === ExportStatus.PROCESSING,
    ).length,
    completed: exports.filter((e) => e.status === ExportStatus.COMPLETED)
      .length,
    failed: exports.filter((e) => e.status === ExportStatus.FAILED).length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
              <svg
                className="h-5 w-5 text-white"
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
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Data Exports</h1>
              <p className="text-xs text-gray-500">
                Export data from any paginated API to CSV
              </p>
            </div>
          </div>

          <button
            onClick={refresh}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            title="Refresh"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h5M20 20v-5h-5M4 9a8 8 0 0114.32-4.906M20 15a8 8 0 01-14.32 4.906"
              />
            </svg>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {!loading && exports.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total" value={counts.total} color="gray" />
            <StatCard label="Active" value={counts.active} color="blue" />
            <StatCard label="Completed" value={counts.completed} color="emerald" />
            <StatCard label="Failed" value={counts.failed} color="red" />
          </div>
        )}

        <div className="mb-6">
          <CreateExportForm
            onSubmit={async (input) => {
              await createExport(input);
            }}
            creating={creating}
          />
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <ExportList
          exports={exports}
          loading={loading}
          onRemove={removeExport}
        />
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const colors: Record<string, string> = {
    gray: 'bg-gray-50 text-gray-600',
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
  };

  return (
    <div
      className={`rounded-xl px-4 py-3 ${colors[color] ?? colors.gray}`}
    >
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
