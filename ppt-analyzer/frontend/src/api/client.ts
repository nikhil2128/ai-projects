import type { AnalysisResult } from "../types";

export async function analyzePptx(file: File): Promise<AnalysisResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/analyze", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? `Upload failed (${response.status})`);
  }

  return response.json() as Promise<AnalysisResult>;
}

export async function downloadReport(result: AnalysisResult): Promise<void> {
  const response = await fetch("/api/generate-ppt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? `Report generation failed (${response.status})`);
  }

  const blob = await response.blob();
  const safeName = result.fileName.replace(/\.(pptx?|PPTX?)$/, "");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName}_Report.pptx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
