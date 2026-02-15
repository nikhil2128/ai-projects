import { useState } from "react";
import { FileUploader } from "./components/FileUploader";
import { AnalysisView } from "./components/AnalysisView";
import { ResultView } from "./components/ResultView";
import { Stepper } from "./components/Stepper";
import { uploadFiles, mergeFiles, deleteSession } from "./api";
import {
  AppStep,
  FileAnalysis,
  MergeResult,
} from "./types";
import { AlertCircle, Layers } from "lucide-react";
import React from "react";

function App() {
  const [step, setStep] = useState<AppStep>("upload");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [fileAnalyses, setFileAnalyses] = useState<FileAnalysis[]>([]);
  const [commonKey, setCommonKey] = useState<string | null>(null);
  const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (files: File[]) => {
    setIsUploading(true);
    setError(null);

    try {
      const response = await uploadFiles(files);
      setSessionId(response.sessionId);
      setFileAnalyses(response.files);
      setCommonKey(response.commonKey);
      setStep("analyze");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setError(axiosErr.response?.data?.error ?? "Upload failed. Please try again.");
      } else {
        setError("Upload failed. Please check your connection and try again.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleMerge = async () => {
    if (!sessionId) return;

    setIsMerging(true);
    setError(null);

    try {
      const response = await mergeFiles(sessionId);
      setMergeResult(response.result);
      setStep("result");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setError(axiosErr.response?.data?.error ?? "Merge failed. Please try again.");
      } else {
        setError("Merge failed. Please check your connection and try again.");
      }
    } finally {
      setIsMerging(false);
    }
  };

  const handleReset = async () => {
    if (sessionId) {
      try {
        await deleteSession(sessionId);
      } catch {
        // Ignore cleanup errors
      }
    }

    setStep("upload");
    setSessionId(null);
    setFileAnalyses([]);
    setCommonKey(null);
    setMergeResult(null);
    setError(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__content">
          <div className="app-header__brand">
            <Layers size={28} />
            <h1>CSV Merger</h1>
          </div>
          <p className="app-header__tagline">
            Upload multiple CSV files, analyze their structure, and merge them
            into a single clean output.
          </p>
        </div>
      </header>

      <main className="app-main">
        <Stepper currentStep={step} />

        {error && (
          <div className="alert alert--error" style={{ marginBottom: "1.5rem" }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {step === "upload" && (
          <FileUploader
            onFilesSelected={handleUpload}
            isUploading={isUploading}
          />
        )}

        {step === "analyze" && (
          <AnalysisView
            files={fileAnalyses}
            commonKey={commonKey}
            onMerge={handleMerge}
            isMerging={isMerging}
          />
        )}

        {step === "result" && mergeResult && sessionId && (
          <ResultView
            result={mergeResult}
            sessionId={sessionId}
            onReset={handleReset}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>CSV Merger — Analyze, transform, and merge your data with ease.</p>
      </footer>
    </div>
  );
}

export default App;
