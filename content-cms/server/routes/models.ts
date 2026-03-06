import { Router, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import * as store from "../store.js";

interface FieldDefinition {
  id: string;
  name: string;
  slug: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface ContentModel {
  id: string;
  name: string;
  slug: string;
  description: string;
  fields: FieldDefinition[];
  createdAt: string;
  updatedAt: string;
}

const router = Router();
const COLLECTION = "models";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

router.get("/", (_req: Request, res: Response) => {
  const models = store.getAll<ContentModel>(COLLECTION);
  res.json({ success: true, data: models });
});

router.get("/:id", (req: Request, res: Response) => {
  const model = store.getById<ContentModel>(COLLECTION, req.params.id);
  if (!model) {
    res.status(404).json({ success: false, error: "Model not found" });
    return;
  }
  res.json({ success: true, data: model });
});

router.post("/", (req: Request, res: Response) => {
  const { name, description, fields } = req.body;

  if (!name || !fields || !Array.isArray(fields)) {
    res.status(400).json({
      success: false,
      error: "Name and fields are required",
    });
    return;
  }

  const now = new Date().toISOString();
  const model: ContentModel = {
    id: uuidv4(),
    name,
    slug: slugify(name),
    description: description || "",
    fields: fields.map((f: Partial<FieldDefinition>) => ({
      ...f,
      id: f.id || uuidv4(),
      slug: f.slug || slugify(f.name || ""),
    })),
    createdAt: now,
    updatedAt: now,
  };

  store.create(COLLECTION, model);
  res.status(201).json({ success: true, data: model });
});

router.put("/:id", (req: Request, res: Response) => {
  const existing = store.getById<ContentModel>(COLLECTION, req.params.id);
  if (!existing) {
    res.status(404).json({ success: false, error: "Model not found" });
    return;
  }

  const { name, description, fields } = req.body;
  const updates: Partial<ContentModel> = { updatedAt: new Date().toISOString() };

  if (name) {
    updates.name = name;
    updates.slug = slugify(name);
  }
  if (description !== undefined) updates.description = description;
  if (fields && Array.isArray(fields)) {
    updates.fields = fields.map((f: Partial<FieldDefinition>) => ({
      ...f,
      id: f.id || uuidv4(),
      slug: f.slug || slugify(f.name || ""),
    }));
  }

  const updated = store.update<ContentModel>(COLLECTION, req.params.id, updates);
  res.json({ success: true, data: updated });
});

router.delete("/:id", (req: Request, res: Response) => {
  const deleted = store.remove<ContentModel>(COLLECTION, req.params.id);
  if (!deleted) {
    res.status(404).json({ success: false, error: "Model not found" });
    return;
  }
  store.removeByField("entries", "modelId", req.params.id);
  res.json({ success: true });
});

export default router;
