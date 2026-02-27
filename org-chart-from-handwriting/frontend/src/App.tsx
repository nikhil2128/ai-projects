import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow
} from "@xyflow/react";

import { buildFlowLayout } from "./layout";
import type { GenerateChartResponse } from "./types";

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export default function App() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");
  const [chartResponse, setChartResponse] = useState<GenerateChartResponse | null>(null);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const chartContainerRef = useRef<HTMLDivElement>(null);

  const flowGraph = useMemo(() => {
    if (!chartResponse?.chart) {
      return { nodes: [], edges: [] };
    }
    return buildFlowLayout(chartResponse.chart);
  }, [chartResponse]);

  const canGenerate = Boolean(imageFile) && !isLoading;
  const canDownload = flowGraph.nodes.length > 0 && !isLoading;

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setImageFile(null);
      setImagePreviewUrl("");
      return;
    }

    setError("");
    setImageFile(file);
    setChartResponse(null);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const onGenerate = async () => {
    if (!imageFile) {
      return;
    }

    setIsLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("image", imageFile);

    try {
      const response = await fetch(`${apiBaseUrl}/api/org-chart/from-image`, {
        method: "POST",
        body: formData
      });

      const data = (await response.json()) as GenerateChartResponse | { error?: string; details?: string };
      if (!response.ok) {
        const details = "details" in data && data.details ? ` (${data.details})` : "";
        const message = "error" in data && data.error ? data.error : "Failed to generate org chart.";
        throw new Error(`${message}${details}`);
      }

      setChartResponse(data as GenerateChartResponse);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unknown request failure.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const onDownload = async () => {
    if (!chartContainerRef.current) {
      return;
    }

    const dataUrl = await toPng(chartContainerRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#f3f6ff"
    });

    const anchor = document.createElement("a");
    anchor.href = dataUrl;
    anchor.download = "organization-chart.png";
    anchor.click();
  };

  return (
    <div className="page">
      <header className="header">
        <h1>Handwritten Org Chart Studio</h1>
        <p>Upload a PNG screenshot of the handwritten structure to auto-generate a clean org chart.</p>
      </header>

      <section className="panel controls-panel">
        <label className="upload">
          <span>Upload screenshot (PNG/JPEG)</span>
          <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={onFileChange} />
        </label>

        <div className="actions">
          <button onClick={onGenerate} disabled={!canGenerate}>
            {isLoading ? "Generating..." : "Generate org chart"}
          </button>
          <button className="secondary" onClick={onDownload} disabled={!canDownload}>
            Download PNG
          </button>
        </div>

        {error && <p className="error">{error}</p>}
      </section>

      <main className="workspace">
        <section className="panel source">
          <h2>Source Image</h2>
          {imagePreviewUrl ? (
            <img className="preview-image" src={imagePreviewUrl} alt="Uploaded org structure screenshot" />
          ) : (
            <EmptyState label="Upload an image to start." />
          )}
        </section>

        <section className="panel chart">
          <h2>Org Chart Preview</h2>
          <div className="chart-canvas" ref={chartContainerRef}>
            {flowGraph.nodes.length > 0 ? (
              <ReactFlow
                nodes={flowGraph.nodes}
                edges={flowGraph.edges}
                fitView
                minZoom={0.2}
                maxZoom={1.6}
                proOptions={{ hideAttribution: true }}
              >
                <MiniMap />
                <Controls />
                <Background gap={20} color="#e2e8f8" />
              </ReactFlow>
            ) : (
              <EmptyState label="Generated org chart appears here." />
            )}
          </div>
        </section>
      </main>

      {chartResponse && (
        <section className="panel metadata">
          <h3>{chartResponse.chart.organizationName}</h3>
          <p>
            Parsed with <strong>{chartResponse.model}</strong> — confidence:{" "}
            <strong>{chartResponse.chart.confidence}</strong>
          </p>
          {chartResponse.chart.assumptions.length > 0 && (
            <p className="assumptions">
              Assumptions: {chartResponse.chart.assumptions.join(" | ")}
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="empty-state">{label}</div>;
}
