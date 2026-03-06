import type { ContentModel, ContentEntry, EntryVersion } from "../types";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function request<T>(
  url: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Request failed");
  return json;
}

export async function fetchModels(): Promise<ContentModel[]> {
  const res = await request<ContentModel[]>("/api/models");
  return res.data ?? [];
}

export async function fetchModel(id: string): Promise<ContentModel> {
  const res = await request<ContentModel>(`/api/models/${id}`);
  return res.data!;
}

export async function createModel(
  data: Pick<ContentModel, "name" | "description" | "fields">,
): Promise<ContentModel> {
  const res = await request<ContentModel>("/api/models", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.data!;
}

export async function updateModel(
  id: string,
  data: Partial<Pick<ContentModel, "name" | "description" | "fields">>,
): Promise<ContentModel> {
  const res = await request<ContentModel>(`/api/models/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return res.data!;
}

export async function deleteModel(id: string): Promise<void> {
  await request(`/api/models/${id}`, { method: "DELETE" });
}

export async function fetchEntries(modelId: string): Promise<ContentEntry[]> {
  const res = await request<ContentEntry[]>(
    `/api/entries/model/${modelId}`,
  );
  return res.data ?? [];
}

export async function fetchEntry(id: string): Promise<ContentEntry> {
  const res = await request<ContentEntry>(`/api/entries/${id}`);
  return res.data!;
}

export async function createEntry(
  modelId: string,
  values: Record<string, unknown>,
): Promise<ContentEntry> {
  const res = await request<ContentEntry>("/api/entries", {
    method: "POST",
    body: JSON.stringify({ modelId, values }),
  });
  return res.data!;
}

export async function updateEntry(
  id: string,
  values: Record<string, unknown>,
): Promise<ContentEntry> {
  const res = await request<ContentEntry>(`/api/entries/${id}`, {
    method: "PUT",
    body: JSON.stringify({ values }),
  });
  return res.data!;
}

export async function deleteEntry(id: string): Promise<void> {
  await request(`/api/entries/${id}`, { method: "DELETE" });
}

export async function publishEntry(id: string): Promise<ContentEntry> {
  const res = await request<ContentEntry>(`/api/entries/${id}/publish`, {
    method: "PUT",
  });
  return res.data!;
}

export async function unpublishEntry(id: string): Promise<ContentEntry> {
  const res = await request<ContentEntry>(`/api/entries/${id}/unpublish`, {
    method: "PUT",
  });
  return res.data!;
}

export async function archiveEntry(id: string): Promise<ContentEntry> {
  const res = await request<ContentEntry>(`/api/entries/${id}/archive`, {
    method: "PUT",
  });
  return res.data!;
}

export async function fetchEntryVersions(id: string): Promise<EntryVersion[]> {
  const res = await request<EntryVersion[]>(`/api/entries/${id}/versions`);
  return res.data ?? [];
}
