import type { AppView } from "../types/org";

interface HeaderProps {
  view: AppView;
  chartTitle?: string;
  isSaved: boolean;
  onNavigateHome: () => void;
  onNewChart: () => void;
  onSave: () => void;
  showVersionPanel: boolean;
  onToggleVersionPanel: () => void;
  versionCount: number;
}

export default function Header({
  view,
  chartTitle,
  isSaved,
  onNavigateHome,
  onNewChart,
  onSave,
  showVersionPanel,
  onToggleVersionPanel,
  versionCount,
}: HeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {view !== "home" && (
            <button
              onClick={onNavigateHome}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors mr-1"
              title="Back to charts"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                />
              </svg>
            </button>
          )}

          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
              />
            </svg>
          </div>
          <div>
            {view === "editing" && chartTitle ? (
              <>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  {chartTitle}
                </h1>
                <p className="text-xs text-slate-500 -mt-0.5">OrgVision</p>
              </>
            ) : (
              <>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  OrgVision
                </h1>
                <p className="text-xs text-slate-500 -mt-0.5">
                  AI-powered org chart generator
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {view === "editing" && !isSaved && (
            <button
              onClick={onSave}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"
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
                  d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
                />
              </svg>
              Save
            </button>
          )}

          {view === "editing" && isSaved && (
            <button
              onClick={onToggleVersionPanel}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                showVersionPanel
                  ? "text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                  : "text-slate-600 bg-slate-100 hover:bg-slate-200"
              }`}
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
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              History
              <span className="bg-slate-200 text-slate-600 text-xs font-bold px-1.5 py-0.5 rounded-full">
                {versionCount}
              </span>
            </button>
          )}

          {view === "home" && (
            <button
              onClick={onNewChart}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              New Chart
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
