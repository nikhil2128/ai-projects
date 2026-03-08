import { Router, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import * as store from "../store.js";

type EntryStatus = "draft" | "published" | "archived";

interface EntryVersion {
  id: string;
  entryId: string;
  versionNumber: number;
  values: Record<string, unknown>;
  createdAt: string;
}

interface ContentEntry {
  id: string;
  modelId: string;
  values: Record<string, unknown>;
  status: EntryStatus;
  versions: EntryVersion[];
  currentVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}

const router = Router();
const COLLECTION = "entries";

function getParam(param: string | string[] | undefined): string {
  return Array.isArray(param) ? (param[0] ?? "") : (param ?? "");
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneValues(values: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(values)) as Record<string, unknown>;
}

function normalizeEntry(entry: Partial<ContentEntry>): ContentEntry {
  const fallbackTimestamp = new Date().toISOString();

  return {
    id: entry.id ?? "",
    modelId: entry.modelId ?? "",
    values: isObjectRecord(entry.values) ? entry.values : {},
    status:
      entry.status === "published" ||
      entry.status === "draft" ||
      entry.status === "archived"
        ? entry.status
        : "draft",
    versions: Array.isArray(entry.versions) ? entry.versions : [],
    currentVersionId:
      typeof entry.currentVersionId === "string" ? entry.currentVersionId : null,
    createdAt: entry.createdAt ?? fallbackTimestamp,
    updatedAt: entry.updatedAt ?? fallbackTimestamp,
  };
}

router.get("/model/:modelId", (req: Request, res: Response) => {
  const modelId = getParam(req.params.modelId);
  const entries = store
    .findByField<ContentEntry>(COLLECTION, "modelId", modelId)
    .map(normalizeEntry);
  res.json({ success: true, data: entries });
});

router.get("/:id/versions", (req: Request, res: Response) => {
  const entryId = getParam(req.params.id);
  const existing = store.getById<ContentEntry>(COLLECTION, entryId);
  if (!existing) {
    res.status(404).json({ success: false, error: "Entry not found" });
    return;
  }

  const entry = normalizeEntry(existing);
  const versions = [...entry.versions].sort(
    (a, b) => b.versionNumber - a.versionNumber,
  );
  res.json({ success: true, data: versions });
});

router.get("/:id", (req: Request, res: Response) => {
  const entryId = getParam(req.params.id);
  const existing = store.getById<ContentEntry>(COLLECTION, entryId);
  if (!existing) {
    res.status(404).json({ success: false, error: "Entry not found" });
    return;
  }
  res.json({ success: true, data: normalizeEntry(existing) });
});

router.post("/", (req: Request, res: Response) => {
  const { modelId, values } = req.body;

  if (!modelId || !isObjectRecord(values)) {
    res.status(400).json({
      success: false,
      error: "modelId and values are required",
    });
    return;
  }

  const model = store.getById("models", modelId);
  if (!model) {
    res.status(404).json({ success: false, error: "Content model not found" });
    return;
  }

  const now = new Date().toISOString();
  const entry: ContentEntry = {
    id: uuidv4(),
    modelId,
    values: cloneValues(values),
    status: "draft",
    versions: [],
    currentVersionId: null,
    createdAt: now,
    updatedAt: now,
  };

  store.create(COLLECTION, entry);
  res.status(201).json({ success: true, data: entry });
});

router.put("/:id/publish", (req: Request, res: Response) => {
  const entryId = getParam(req.params.id);
  const existingRaw = store.getById<ContentEntry>(COLLECTION, entryId);
  if (!existingRaw) {
    res.status(404).json({ success: false, error: "Entry not found" });
    return;
  }

  const existing = normalizeEntry(existingRaw);
  const now = new Date().toISOString();
  const version: EntryVersion = {
    id: uuidv4(),
    entryId: existing.id,
    versionNumber: existing.versions.length + 1,
    values: cloneValues(existing.values),
    createdAt: now,
  };

  const updated = store.update<ContentEntry>(COLLECTION, entryId, {
    status: "published",
    versions: [...existing.versions, version],
    currentVersionId: version.id,
    updatedAt: now,
  });

  res.json({ success: true, data: normalizeEntry(updated ?? existing) });
});

router.put("/:id/archive", (req: Request, res: Response) => {
  const entryId = getParam(req.params.id);
  const existing = store.getById<ContentEntry>(COLLECTION, entryId);
  if (!existing) {
    res.status(404).json({ success: false, error: "Entry not found" });
    return;
  }

  const updated = store.update<ContentEntry>(COLLECTION, entryId, {
    status: "archived",
    updatedAt: new Date().toISOString(),
  });
  res.json({ success: true, data: normalizeEntry(updated ?? existing) });
});

router.put("/:id/unpublish", (req: Request, res: Response) => {
  const entryId = getParam(req.params.id);
  const existing = store.getById<ContentEntry>(COLLECTION, entryId);
  if (!existing) {
    res.status(404).json({ success: false, error: "Entry not found" });
    return;
  }

  const updated = store.update<ContentEntry>(COLLECTION, entryId, {
    status: "draft",
    updatedAt: new Date().toISOString(),
  });
  res.json({ success: true, data: normalizeEntry(updated ?? existing) });
});

router.put("/:id", (req: Request, res: Response) => {
  const entryId = getParam(req.params.id);
  const existingRaw = store.getById<ContentEntry>(COLLECTION, entryId);
  if (!existingRaw) {
    res.status(404).json({ success: false, error: "Entry not found" });
    return;
  }
  const existing = normalizeEntry(existingRaw);

  const { values } = req.body;
  const updates: Partial<ContentEntry> = {
    updatedAt: new Date().toISOString(),
  };

  if (values !== undefined) {
    if (!isObjectRecord(values)) {
      res.status(400).json({ success: false, error: "values must be an object" });
      return;
    }

    const nextValues = cloneValues(values);
    updates.values = nextValues;
    if (JSON.stringify(existing.values) !== JSON.stringify(nextValues)) {
      updates.status = "draft";
    }
  }

  const updated = store.update<ContentEntry>(
    COLLECTION,
    entryId,
    updates,
  );
  res.json({ success: true, data: normalizeEntry(updated ?? existing) });
});

router.delete("/:id", (req: Request, res: Response) => {
  const entryId = getParam(req.params.id);
  const deleted = store.remove<ContentEntry>(COLLECTION, entryId);
  if (!deleted) {
    res.status(404).json({ success: false, error: "Entry not found" });
    return;
  }
  res.json({ success: true });
});

export default router;
