import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { Header } from "./Header";
import { TrainingViewer } from "./TrainingViewer";
import { fetchSession } from "../api/client";
import type { TrainingSession } from "../types";

export function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchSession(id)
      .then(setSession)
      .catch(() => setError("Session not found"))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        title={session?.title ?? "Session Details"}
        showBack
        onBack={() => navigate("/history")}
      />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="py-20 text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-violet-400 mx-auto" />
            <p className="text-slate-400">Loading session...</p>
          </div>
        ) : error || !session ? (
          <div className="py-20 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
            <p className="text-red-300 font-medium">{error ?? "Session not found"}</p>
            <button
              onClick={() => navigate("/history")}
              className="mt-4 px-6 py-2.5 rounded-xl bg-white/10 text-slate-300 text-sm font-medium hover:bg-white/15 transition-colors"
            >
              Back to History
            </button>
          </div>
        ) : (
          <TrainingViewer modules={session.modules} />
        )}
      </main>
    </div>
  );
}
