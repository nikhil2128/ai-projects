import { useState } from "react";
import Header from "./components/Header";
import UploadArea from "./components/UploadArea";
import OrgChart from "./components/OrgChart";
import type { OrgNode, AppState } from "./types/org";
import { parseOrgChartImage } from "./utils/api";

export default function App() {
  const [state, setState] = useState<AppState>("idle");
  const [orgData, setOrgData] = useState<OrgNode | null>(null);
  const [error, setError] = useState<string>("");

  const handleFileSelected = async (file: File) => {
    setState("parsing");
    setError("");

    try {
      const result = await parseOrgChartImage(file);
      if (result.success && result.data) {
        setOrgData(result.data);
        setState("ready");
      } else {
        setError(result.error || "Failed to parse org chart");
        setState("error");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong",
      );
      setState("error");
    }
  };

  const handleReset = () => {
    setState("idle");
    setOrgData(null);
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <Header hasChart={state === "ready"} onReset={handleReset} />

      {state === "error" && (
        <div className="max-w-xl mx-auto mt-8 px-6">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-6 h-6 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
            </div>
            <p className="text-red-800 font-medium mb-1">
              Unable to parse the image
            </p>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {(state === "idle" || state === "parsing") && (
        <UploadArea
          onFileSelected={handleFileSelected}
          isProcessing={state === "parsing"}
        />
      )}

      {state === "ready" && orgData && <OrgChart data={orgData} />}
    </div>
  );
}
