import type { OrgChartVersion } from "../types/org";

interface VersionPanelProps {
  versions: OrgChartVersion[];
  activeVersionId: string;
  onViewVersion: (versionId: string) => void;
  onDownloadVersion: (versionId: string) => void;
  onClose: () => void;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function VersionPanel({
  versions,
  activeVersionId,
  onViewVersion,
  onDownloadVersion,
  onClose,
}: VersionPanelProps) {
  return (
    <div className="w-72 border-l border-slate-200 bg-white flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-900">
          Version History
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {[...versions].reverse().map((version, idx) => {
          const versionNumber = versions.length - idx;
          const isActive = version.id === activeVersionId;
          return (
            <div
              key={version.id}
              className={`group mx-2 mb-1 rounded-xl px-3 py-2.5 cursor-pointer transition-all ${
                isActive
                  ? "bg-indigo-50 border border-indigo-200"
                  : "hover:bg-slate-50 border border-transparent"
              }`}
              onClick={() => onViewVersion(version.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      isActive
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {versionNumber}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${
                        isActive ? "text-indigo-900" : "text-slate-700"
                      }`}
                    >
                      Version {versionNumber}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatTimestamp(version.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {isActive && (
                    <span className="text-[10px] font-medium text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-full">
                      Viewing
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownloadVersion(version.id);
                    }}
                    className={`p-1 rounded-lg transition-all ${
                      isActive
                        ? "text-indigo-500 hover:text-indigo-700 hover:bg-indigo-100"
                        : "opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    }`}
                    title="Download PNG"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-3 border-t border-slate-100">
        <p className="text-xs text-slate-400 text-center">
          {versions.length} version{versions.length === 1 ? "" : "s"} total
        </p>
      </div>
    </div>
  );
}
