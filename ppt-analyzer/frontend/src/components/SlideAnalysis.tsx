import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  ClipboardList,
  Download,
  FileText,
  Lightbulb,
  Loader2,
  RotateCcw,
} from "lucide-react";
import type { AnalysisResult } from "../types";
import { downloadReport } from "../api/client";
import { ChartView } from "./ChartView";
import { ActionPlan } from "./ActionPlan";

interface SlideAnalysisProps {
  result: AnalysisResult;
  onReset: () => void;
}

export function SlideAnalysis({ result, onReset }: SlideAnalysisProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const slide = result.slides[activeSlide];

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError("");
    try {
      await downloadReport(result);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  if (!slide) return null;

  const hasCharts = slide.charts.length > 0;
  const hasActions =
    slide.actionPlan !== null && slide.actionPlan.actions.length > 0;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">
            {result.fileName}
          </h2>
          <p className="text-slate-400 text-sm">{result.overallSummary}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors rounded-lg px-4 py-2 shadow-lg shadow-indigo-500/20"
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {downloading ? "Generating..." : "Download Report"}
          </button>
          <button
            onClick={onReset}
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-lg px-4 py-2"
          >
            <RotateCcw className="w-4 h-4" />
            Analyze another
          </button>
        </div>
      </div>

      {downloadError && (
        <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 animate-slide-up">
          <p className="text-red-400 text-sm">{downloadError}</p>
        </div>
      )}

      {/* Slide navigator */}
      <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveSlide((p) => Math.max(0, p - 1))}
          disabled={activeSlide === 0}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>

        {result.slides.map((s, idx) => (
          <button
            key={s.slideNumber}
            onClick={() => setActiveSlide(idx)}
            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              idx === activeSlide
                ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            {s.slideNumber}
          </button>
        ))}

        <button
          onClick={() =>
            setActiveSlide((p) => Math.min(result.slides.length - 1, p + 1))
          }
          disabled={activeSlide === result.slides.length - 1}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          <ArrowRight className="w-4 h-4 text-white" />
        </button>

        <span className="text-xs text-slate-500 ml-auto shrink-0">
          Slide {activeSlide + 1} of {result.totalSlides}
        </span>
      </div>

      {/* Slide content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" key={slide.slideNumber}>
        {/* Left column - Summary & Key Points */}
        <div className="lg:col-span-1 space-y-6 animate-slide-up">
          {/* Title & Summary */}
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-indigo-400" />
              <h3 className="text-white font-semibold">{slide.title}</h3>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              {slide.summary}
            </p>
          </div>

          {/* Key Points */}
          {slide.keyPoints.length > 0 && (
            <div className="glass-card rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <h3 className="text-white font-semibold">Key Points</h3>
              </div>
              <ul className="space-y-2">
                {slide.keyPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                    <span className="text-slate-300">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right column - Charts & Actions */}
        <div
          className="lg:col-span-2 space-y-6 animate-slide-up"
          style={{ animationDelay: "100ms" }}
        >
          {/* Charts */}
          {hasCharts && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                <h3 className="text-white font-semibold">
                  Generated Charts
                </h3>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {slide.charts.map((chart, i) => (
                  <ChartView key={i} chart={chart} />
                ))}
              </div>
            </div>
          )}

          {/* Action Plan */}
          {hasActions && slide.actionPlan && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ClipboardList className="w-4 h-4 text-emerald-400" />
                <h3 className="text-white font-semibold">Action Plan</h3>
              </div>
              <ActionPlan plan={slide.actionPlan} />
            </div>
          )}

          {/* No charts or actions */}
          {!hasCharts && !hasActions && (
            <div className="glass-card rounded-xl p-12 text-center">
              <p className="text-slate-500 text-sm">
                No charts or action items were generated for this slide.
                <br />
                The content may be introductory or purely informational.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
