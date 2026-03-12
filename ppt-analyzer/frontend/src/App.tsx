import { useState } from "react";
import type { AnalysisResult, AppState } from "./types";
import { analyzePptx } from "./api/client";
import { Layout } from "./components/Layout";
import { FileUpload } from "./components/FileUpload";
import { SlideAnalysis } from "./components/SlideAnalysis";

export default function App() {
  const [state, setState] = useState<AppState>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string>("");

  const handleUpload = async (file: File) => {
    setState("uploading");
    setError("");
    setResult(null);

    try {
      setState("analyzing");
      const analysis = await analyzePptx(file);
      setResult(analysis);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setState("error");
    }
  };

  const handleReset = () => {
    setState("idle");
    setResult(null);
    setError("");
  };

  return (
    <Layout>
      {(state === "idle" || state === "error") && (
        <FileUpload onUpload={handleUpload} error={error} />
      )}

      {(state === "uploading" || state === "analyzing") && (
        <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
          <div className="relative w-20 h-20 mb-8">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-400 animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Analyzing your presentation...
          </h2>
          <p className="text-slate-400 text-sm">
            Extracting slides, generating charts, and building action plans
          </p>
        </div>
      )}

      {state === "done" && result && (
        <SlideAnalysis result={result} onReset={handleReset} />
      )}
    </Layout>
  );
}
