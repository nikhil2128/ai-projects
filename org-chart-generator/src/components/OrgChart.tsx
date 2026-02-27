import { useRef, useState } from "react";
import type { OrgNode } from "../types/org";
import OrgNodeCard from "./OrgNode";
import { downloadAsPng, downloadAsSvg } from "../utils/download";

interface OrgChartProps {
  data: OrgNode;
}

export default function OrgChart({ data }: OrgChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (format: "png" | "svg") => {
    if (!chartRef.current) return;
    setDownloading(true);
    try {
      if (format === "png") {
        await downloadAsPng(chartRef.current);
      } else {
        await downloadAsSvg(chartRef.current);
      }
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full min-h-[calc(100vh-80px)] py-8 px-6">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => handleDownload("png")}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
          Download PNG
        </button>
        <button
          onClick={() => handleDownload("svg")}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 font-medium rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
            />
          </svg>
          Download SVG
        </button>
      </div>

      <div className="w-full overflow-x-auto pb-8">
        <div
          ref={chartRef}
          className="org-chart-container inline-flex justify-center min-w-full py-8"
        >
          <ul className="org-tree flex flex-row">
            <OrgNodeCard node={data} depth={0} />
          </ul>
        </div>
      </div>
    </div>
  );
}
