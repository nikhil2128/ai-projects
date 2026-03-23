import axios from "axios";
import { MergeResponse, UploadResponse } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001/api";

const api = axios.create({
  baseURL: API_BASE,
});

export async function uploadFiles(files: File[]): Promise<UploadResponse> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const response = await api.post<UploadResponse>("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
}

export async function mergeFiles(sessionId: string): Promise<MergeResponse> {
  const response = await api.post<MergeResponse>("/merge", { sessionId });
  return response.data;
}

/**
 * Download the merged CSV via a streaming GET request.
 * Returns a Blob that can be turned into an object URL for download.
 */
export async function downloadMergedCSV(sessionId: string): Promise<Blob> {
  const response = await api.get(`/download/${sessionId}`, {
    responseType: "blob",
  });
  return response.data;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await api.delete(`/session/${sessionId}`);
}

export { API_BASE };
