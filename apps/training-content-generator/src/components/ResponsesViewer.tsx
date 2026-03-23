import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  BookOpen,
  Loader2,
  AlertCircle,
  Users,
  BarChart3,
  Clock,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { fetchQuestionnaire, fetchResponses } from "../api/client";
import type { Questionnaire, QuestionnaireResponse } from "../types";

export function ResponsesViewer() {
  const { id } = useParams<{ id: string }>();
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [responses, setResponses] = useState<QuestionnaireResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      const [q, r] = await Promise.all([
        fetchQuestionnaire(id),
        fetchResponses(id),
      ]);
      setQuestionnaire(q);
      setResponses(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    }
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [id]);

  const refresh = async () => {
    if (!id) return;
    setRefreshing(true);
    try {
      const r = await fetchResponses(id);
      setResponses(r);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading responses...</span>
        </div>
      </div>
    );
  }

  if (error || !questionnaire) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-card p-8 max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-slate-200">Error</h2>
          <p className="text-slate-400">{error ?? "Not found"}</p>
        </div>
      </div>
    );
  }

  const avgScore = responses.length > 0
    ? Math.round(responses.reduce((sum, r) => sum + (r.score / r.totalQuestions) * 100, 0) / responses.length)
    : 0;

  const passCount = responses.filter((r) => (r.score / r.totalQuestions) >= 0.7).length;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="glass border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold gradient-text">Assessment Responses</h1>
            <p className="text-xs text-slate-400">{questionnaire.title}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-200">Dashboard</h2>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={<Users className="w-5 h-5 text-blue-400" />}
            label="Total Responses"
            value={String(responses.length)}
            bgClass="bg-blue-500/15"
          />
          <StatCard
            icon={<BarChart3 className="w-5 h-5 text-violet-400" />}
            label="Average Score"
            value={responses.length > 0 ? `${avgScore}%` : "—"}
            bgClass="bg-violet-500/15"
          />
          <StatCard
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            label="Passed (≥70%)"
            value={responses.length > 0 ? `${passCount}/${responses.length}` : "—"}
            bgClass="bg-emerald-500/15"
          />
        </div>

        {responses.length === 0 ? (
          <div className="glass-card p-12 text-center space-y-3">
            <Users className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-slate-400">No responses yet</p>
            <p className="text-sm text-slate-500">Responses will appear here as employees complete the assessment</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Employee</th>
                    <th className="px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Score</th>
                    <th className="px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Percentage</th>
                    <th className="px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {responses
                    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
                    .map((r) => {
                      const pct = Math.round((r.score / r.totalQuestions) * 100);
                      const passed = pct >= 70;
                      return (
                        <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-3.5 text-slate-200 font-medium">{r.employeeEmail}</td>
                          <td className="px-5 py-3.5 text-slate-300">{r.score}/{r.totalQuestions}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-20 h-2 rounded-full bg-white/10 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${passed ? "bg-emerald-500" : "bg-amber-500"}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className={`text-sm font-medium ${passed ? "text-emerald-400" : "text-amber-400"}`}>
                                {pct}%
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                              passed
                                ? "bg-emerald-500/15 text-emerald-400"
                                : "bg-amber-500/15 text-amber-400"
                            }`}>
                              {passed ? "Passed" : "Needs Review"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-400 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(r.submittedAt).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  bgClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bgClass: string;
}) {
  return (
    <div className="glass-card p-5 space-y-3">
      <div className={`p-2.5 rounded-xl w-fit ${bgClass}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-200">{value}</p>
        <p className="text-sm text-slate-400">{label}</p>
      </div>
    </div>
  );
}
