import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  Image,
  PenLine,
  Trash2,
  ChevronRight,
  Loader2,
  AlertCircle,
  FolderOpen,
} from "lucide-react";
import { Header } from "./Header";
import { fetchSessions, deleteSessionApi } from "../api/client";
import type { TrainingSessionSummary } from "../types";

export function HistoryPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<TrainingSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSessions();
      setSessions(data);
    } catch {
      setError("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this training session? This cannot be undone.")) return;

    setDeletingId(id);
    try {
      await deleteSessionApi(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setError("Failed to delete session");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header title="Training History" />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6 animate-fade-in">
          <div>
            <h2 className="text-2xl font-bold gradient-text">Past Sessions</h2>
            <p className="text-sm text-slate-400 mt-1">
              View, download, or manage your previously generated training content
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-400/30 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="py-20 text-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-violet-400 mx-auto" />
              <p className="text-slate-400">Loading history...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <FolderOpen className="w-12 h-12 text-slate-600 mx-auto" />
              <div>
                <p className="text-slate-300 font-medium text-lg">No sessions yet</p>
                <p className="text-slate-500 text-sm mt-1">
                  Generate training content to see it here
                </p>
              </div>
              <button
                onClick={() => navigate("/")}
                className="mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-medium text-sm hover:from-blue-500 hover:to-violet-500 transition-all shadow-lg shadow-blue-500/20"
              >
                Create Training
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => navigate(`/history/${session.id}`)}
                  className="w-full glass-card p-5 flex items-center gap-4 hover:border-white/20 hover:bg-white/[0.04] transition-all group text-left"
                >
                  <div className={`p-3 rounded-xl flex-shrink-0 ${
                    session.source === "image"
                      ? "bg-gradient-to-br from-blue-500/20 to-cyan-500/20"
                      : "bg-gradient-to-br from-violet-500/20 to-purple-500/20"
                  }`}>
                    {session.source === "image" ? (
                      <Image className="w-5 h-5 text-blue-400" />
                    ) : (
                      <PenLine className="w-5 h-5 text-violet-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-200 truncate">
                      {session.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(session.createdAt)}
                      </span>
                      <span className="text-xs text-slate-600">•</span>
                      <span className="text-xs text-slate-500">
                        {session.topicCount} topic{session.topicCount !== 1 ? "s" : ""}
                      </span>
                      <span className="text-xs text-slate-600">•</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        session.source === "image"
                          ? "bg-blue-500/10 text-blue-400"
                          : "bg-violet-500/10 text-violet-400"
                      }`}>
                        {session.source === "image" ? "From Image" : "Manual"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {session.topics.slice(0, 4).map((topic, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-white/5 text-slate-400 text-xs"
                        >
                          {topic}
                        </span>
                      ))}
                      {session.topics.length > 4 && (
                        <span className="px-2 py-0.5 rounded-md bg-white/5 text-slate-500 text-xs">
                          +{session.topics.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => handleDelete(e, session.id)}
                      disabled={deletingId === session.id}
                      className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-all"
                      title="Delete session"
                    >
                      {deletingId === session.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                    <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
