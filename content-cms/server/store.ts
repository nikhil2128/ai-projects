import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function filePath(collection: string): string {
  return path.join(DATA_DIR, `${collection}.json`);
}

function readCollection<T>(collection: string): T[] {
  ensureDir();
  const fp = filePath(collection);
  if (!fs.existsSync(fp)) return [];
  const raw = fs.readFileSync(fp, "utf-8");
  return JSON.parse(raw) as T[];
}

function writeCollection<T>(collection: string, data: T[]): void {
  ensureDir();
  fs.writeFileSync(filePath(collection), JSON.stringify(data, null, 2));
}

export function getAll<T>(collection: string): T[] {
  return readCollection<T>(collection);
}

export function getById<T extends { id: string }>(
  collection: string,
  id: string,
): T | undefined {
  return readCollection<T>(collection).find((item) => item.id === id);
}

export function create<T extends { id: string }>(
  collection: string,
  item: T,
): T {
  const items = readCollection<T>(collection);
  items.push(item);
  writeCollection(collection, items);
  return item;
}

export function update<T extends { id: string }>(
  collection: string,
  id: string,
  updates: Partial<T>,
): T | undefined {
  const items = readCollection<T>(collection);
  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1) return undefined;
  items[idx] = { ...items[idx], ...updates };
  writeCollection(collection, items);
  return items[idx];
}

export function remove<T extends { id: string }>(
  collection: string,
  id: string,
): boolean {
  const items = readCollection<T>(collection);
  const filtered = items.filter((item) => item.id !== id);
  if (filtered.length === items.length) return false;
  writeCollection(collection, filtered);
  return true;
}

export function findByField<T extends Record<string, unknown>>(
  collection: string,
  field: keyof T,
  value: unknown,
): T[] {
  return readCollection<T>(collection).filter((item) => item[field] === value);
}

export function removeByField<T extends Record<string, unknown>>(
  collection: string,
  field: keyof T,
  value: unknown,
): number {
  const items = readCollection<T>(collection);
  const filtered = items.filter((item) => item[field] !== value);
  const removedCount = items.length - filtered.length;
  writeCollection(collection, filtered);
  return removedCount;
}
