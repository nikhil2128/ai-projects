import { useState } from "react";
import type { AuthUser } from "../types";
import { login } from "../utils/api";

interface LoginPageProps {
  onLogin: (user: AuthUser) => void;
}

const DEMO_USERS = [
  { username: "alice", role: "Writer", description: "Create, edit, delete own entries" },
  { username: "bob", role: "Writer", description: "Create, edit, delete own entries" },
  { username: "carol", role: "Reviewer", description: "Review entries (read-only)" },
  { username: "dave", role: "Approver", description: "Approve and publish entries" },
];

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Username and password are required");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const { user } = await login(username.trim(), password);
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoUsername: string) => {
    setUsername(demoUsername);
    setPassword("password123");
    setError("");
    setLoading(true);
    try {
      const { user } = await login(demoUsername, "password123");
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const roleBadgeColor: Record<string, string> = {
    Writer: "bg-blue-100 text-blue-700",
    Reviewer: "bg-amber-100 text-amber-700",
    Approver: "bg-emerald-100 text-emerald-700",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-200">
            <svg
              className="w-7 h-7 text-white"
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
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            ContentForge
          </h1>
          <p className="text-slate-500 mt-1">Sign in to manage your content</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium rounded-xl shadow-sm hover:shadow-md hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Demo Accounts
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            Password for all accounts: <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-slate-600">password123</code>
          </p>
          <div className="space-y-2">
            {DEMO_USERS.map((user) => (
              <button
                key={user.username}
                onClick={() => handleQuickLogin(user.username)}
                disabled={loading}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-colors text-left disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-600 shrink-0">
                  {user.username[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">
                      {user.username}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${roleBadgeColor[user.role]}`}
                    >
                      {user.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {user.description}
                  </p>
                </div>
                <svg
                  className="w-4 h-4 text-slate-400 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
