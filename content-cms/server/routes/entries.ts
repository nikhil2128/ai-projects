import { Router, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import * as store from "../store.js";

interface ContentEntry {
  id: string;
  modelId: string;
  values: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

const router = Router();
const COLLECTION = "entries";

router.get("/model/:modelId", (req: Request, res: Response) => {
  const entries = store.findByField<ContentEntry>(
    COLLECTION,
    "modelId",
    req.params.modelId,
  );
  res.json({ success: true, data: entries });
});

router.get("/:id", (req: Request, res: Response) => {
  const entry = store.getById<ContentEntry>(COLLECTION, req.params.id);
  if (!entry) {
    res.status(404).json({ success: false, error: "Entry not found" });
    return;
  }
  res.json({ success: true, data: entry });
});

router.post("/", (req: Request, res: Response) => {
  const { modelId, values } = req.body;

  if (!modelId || !values) {
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
    values,
    createdAt: now,
    updatedAt: now,
  };

  store.create(COLLECTION, entry);
  res.status(201).json({ success: true, data: entry });
});

router.put("/:id", (req: Request, res: Response) => {
  const existing = store.getById<ContentEntry>(COLLECTION, req.params.id);
  if (!existing) {
    res.status(404).json({ success: false, error: "Entry not found" });
    return;
  }

  const { values } = req.body;
  const updates: Partial<ContentEntry> = {
    updatedAt: new Date().toISOString(),
  };

  if (values) updates.values = values;

  const updated = store.update<ContentEntry>(
    COLLECTION,
    req.params.id,
    updates,
  );
  res.json({ success: true, data: updated });
});

router.delete("/:id", (req: Request, res: Response) => {
  const deleted = store.remove<ContentEntry>(COLLECTION, req.params.id);
  if (!deleted) {
    res.status(404).json({ success: false, error: "Entry not found" });
    return;
  }
  res.json({ success: true });
});

export default router;
