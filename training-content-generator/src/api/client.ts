import type { TrainingModule } from "../types";

export async function fetchTopicImages(
  queries: string[]
): Promise<Record<string, string>> {
  const response = await fetch("/api/topic-images", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ queries }),
  });

  if (!response.ok) {
    console.warn("Topic image fetch failed, will use fallback art");
    return {};
  }

  const data = (await response.json()) as {
    success: boolean;
    images: Record<string, string>;
  };
  return data.images;
}

export async function extractTopicsFromImage(
  file: File
): Promise<string[]> {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("/api/extract-topics", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error ?? "Failed to extract topics");
  }

  const data = (await response.json()) as { success: boolean; topics: string[] };
  return data.topics;
}

export async function generateContent(
  topics: string[]
): Promise<TrainingModule[]> {
  const response = await fetch("/api/generate-content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topics }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error ?? "Failed to generate content");
  }

  const data = (await response.json()) as {
    success: boolean;
    content: TrainingModule[];
  };
  return data.content;
}
