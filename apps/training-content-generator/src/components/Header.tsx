import { BookOpen, ArrowLeft, History } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import type { AppView } from "../types";

interface HeaderProps {
  view?: AppView;
  onBack?: () => void;
  title?: string;
  showBack?: boolean;
}

export function Header({ view, onBack, title, showBack }: HeaderProps) {
  const location = useLocation();
  const isHistoryPage = location.pathname === "/history" || location.pathname.startsWith("/history/");
  const showBackButton = showBack || (view && view !== "home");

  return (
    <header className="glass border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
        {showBackButton && (
          <button
            onClick={onBack ?? (() => window.history.back())}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600">
            <BookOpen className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-xl font-bold gradient-text">
              {title ?? "Training Content Generator"}
            </h1>
            <p className="text-xs text-slate-400">
              AI-powered employee training materials
            </p>
          </div>
        </div>

        <div className="ml-auto">
          {!isHistoryPage ? (
            <Link
              to="/history"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-medium hover:bg-white/10 hover:text-white transition-all"
            >
              <History className="w-4 h-4" />
              History
            </Link>
          ) : (
            <Link
              to="/"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-medium hover:from-blue-500 hover:to-violet-500 transition-all shadow-lg shadow-blue-500/20"
            >
              New Training
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
