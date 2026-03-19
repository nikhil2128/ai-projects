import { BookOpen, ArrowLeft } from "lucide-react";
import type { AppView } from "../types";

interface HeaderProps {
  view: AppView;
  onBack: () => void;
}

export function Header({ view, onBack }: HeaderProps) {
  return (
    <header className="glass border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
        {view !== "home" && (
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold gradient-text">
              Training Content Generator
            </h1>
            <p className="text-xs text-slate-400">
              AI-powered employee training materials
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
