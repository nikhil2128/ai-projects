import { HistoryEntry, FloorPlan } from '../types';

const STORAGE_KEY = 'floorviz_history';
const MAX_ENTRIES = 30;

export function getHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export function getHistoryEntry(id: string): HistoryEntry | undefined {
  return getHistory().find((e) => e.id === id);
}

export function addHistoryEntry(imageDataUrl: string, floorPlan: FloorPlan): HistoryEntry {
  const entry: HistoryEntry = {
    id: crypto.randomUUID(),
    imageDataUrl,
    floorPlan,
    createdAt: new Date().toISOString(),
  };

  const entries = [entry, ...getHistory()].slice(0, MAX_ENTRIES);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // quota exceeded — drop oldest entries until it fits
    for (let len = entries.length - 1; len >= 1; len--) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, len)));
        break;
      } catch {
        continue;
      }
    }
  }

  return entry;
}

export function deleteHistoryEntry(id: string): void {
  const entries = getHistory().filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
