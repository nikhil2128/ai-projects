import type { ParseResponse } from "../types/org";

export async function parseOrgChartImage(
  file: File,
): Promise<ParseResponse> {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("/api/parse", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Server error: ${response.status}`);
  }

  return response.json();
}
