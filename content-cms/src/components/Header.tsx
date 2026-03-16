import type { AuthUser } from "../types";

interface HeaderProps {
  user: AuthUser;
  onNavigateHome: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  breadcrumb?: { label: string; onClick?: () => void }[];
}

const ROLE_BADGE: Record<string, string> = {
  writer: "bg-blue-100 text-blue-700",
  reviewer: "bg-amber-100 text-amber-700",
  approver: "bg-emerald-100 text-emerald-700",
};

export default function Header({
  user,
  onNavigateHome,
  onOpenSettings,
  onLogout,
  breadcrumb,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 flex items-center h-16 gap-4">
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity shrink-0"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-sm">
            <svg
              className="w-4.5 h-4.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
              />
            </svg>
          </div>
          <span className="text-lg font-semibold text-slate-800 tracking-tight">
            ContentForge
          </span>
        </button>

        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="flex items-center gap-1.5 text-sm overflow-hidden">
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5 min-w-0">
                <svg
                  className="w-4 h-4 text-slate-300 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
                {crumb.onClick ? (
                  <button
                    onClick={crumb.onClick}
                    className="text-slate-500 hover:text-slate-700 transition-colors truncate"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="text-slate-700 font-medium truncate">
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={onOpenSettings}
            className="px-3.5 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Localization
          </button>

          <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-600">
              {user.displayName[0].toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-slate-700 leading-tight">
                {user.displayName}
              </p>
              <span
                className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-full ${ROLE_BADGE[user.role] ?? "bg-slate-100 text-slate-700"}`}
              >
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </span>
            </div>
            <button
              onClick={onLogout}
              title="Sign out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
