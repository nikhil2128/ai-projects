import type { OrgChartDocument } from "../types/org";

const STORAGE_KEY = "orgvision-charts";

export function getAllDocuments(): OrgChartDocument[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OrgChartDocument[];
  } catch {
    return [];
  }
}

export function getDocument(id: string): OrgChartDocument | null {
  return getAllDocuments().find((d) => d.id === id) ?? null;
}

export function saveDocument(doc: OrgChartDocument): void {
  const docs = getAllDocuments();
  const index = docs.findIndex((d) => d.id === doc.id);
  if (index >= 0) {
    docs[index] = doc;
  } else {
    docs.push(doc);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

export function deleteDocument(id: string): void {
  const docs = getAllDocuments().filter((d) => d.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

export function generateId(): string {
  return crypto.randomUUID();
}
