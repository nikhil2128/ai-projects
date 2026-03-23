import { Presentation } from "lucide-react";
import type { ReactNode } from "react";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen text-white">
      <header className="border-b border-white/10 glass">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/20">
            <Presentation className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">PPT Analyzer</h1>
            <p className="text-xs text-slate-400">
              AI-powered presentation insights
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
