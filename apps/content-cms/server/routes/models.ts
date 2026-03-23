import { Router, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import * as store from "../store.js";

interface FieldDefinition {
  id: string;
  name: string;
  slug: string;
  type: string;
  required: boolean;
  localizable?: boolean;
  placeholder?: string;
  options?: string[];
}

interface ContentModel {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  description: string;
  fields: FieldDefinition[];
  createdAt: string;
  updatedAt: string;
}

const router = Router();
const COLLECTION = "models";
const LOCALIZABLE_FIELD_TYPES = new Set(["text", "textarea", "richtext"]);

function getParam(param: string | string[] | undefined): string {
  return Array.isArray(param) ? (param[0] ?? "") : (param ?? "");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

function toFieldDefinition(field: Partial<FieldDefinition>): FieldDefinition | null {
  if (typeof field.name !== "string" || typeof field.type !== "string") {
    return null;
  }

  const supportsLocalization = LOCALIZABLE_FIELD_TYPES.has(field.type);

  return {
    id: typeof field.id === "string" && field.id ? field.id : uuidv4(),
    name: field.name,
    slug:
      typeof field.slug === "string" && field.slug
        ? field.slug
        : slugify(field.name),
    type: field.type,
    required: Boolean(field.required),
    localizable: supportsLocalization ? Boolean(field.localizable) : false,
    placeholder:
      typeof field.placeholder === "string" ? field.placeholder : undefined,
    options: Array.isArray(field.options)
      ? field.options.filter((option): option is string => typeof option === "string")
      : undefined,
  };
}

router.get("/", (_req: Request, res: Response) => {
  const models = store.getAll<ContentModel>(COLLECTION, _req.user!.companyId);
  res.json({ success: true, data: models });
});

router.get("/:id", (req: Request, res: Response) => {
  const modelId = getParam(req.params.id);
  const model = store.getById<ContentModel>(
    COLLECTION,
    modelId,
    req.user!.companyId,
  );
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

  const normalizedFields = fields.map((field: Partial<FieldDefinition>) =>
    toFieldDefinition(field),
  );
  const fieldDefinitions = normalizedFields.filter(
    (field): field is FieldDefinition => field !== null,
  );
  if (fieldDefinitions.length !== fields.length) {
    res.status(400).json({
      success: false,
      error: "Each field must include a name and type",
    });
    return;
  }

  const now = new Date().toISOString();
  const model: ContentModel = {
    id: uuidv4(),
    companyId: req.user!.companyId,
    name,
    slug: slugify(name),
    description: description || "",
    fields: fieldDefinitions,
    createdAt: now,
    updatedAt: now,
  };

  store.create(COLLECTION, model);
  res.status(201).json({ success: true, data: model });
});

router.put("/:id", (req: Request, res: Response) => {
  const modelId = getParam(req.params.id);
  const existing = store.getById<ContentModel>(
    COLLECTION,
    modelId,
    req.user!.companyId,
  );
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
    const normalizedFields = fields.map((field: Partial<FieldDefinition>) =>
      toFieldDefinition(field),
    );
    const fieldDefinitions = normalizedFields.filter(
      (field): field is FieldDefinition => field !== null,
    );
    if (fieldDefinitions.length !== fields.length) {
      res.status(400).json({
        success: false,
        error: "Each field must include a name and type",
      });
      return;
    }
    updates.fields = fieldDefinitions;
  }

  const updated = store.update<ContentModel>(
    COLLECTION,
    modelId,
    updates,
    req.user!.companyId,
  );
  res.json({ success: true, data: updated });
});

router.delete("/:id", (req: Request, res: Response) => {
  const modelId = getParam(req.params.id);
  const deleted = store.remove<ContentModel>(
    COLLECTION,
    modelId,
    req.user!.companyId,
  );
  if (!deleted) {
    res.status(404).json({ success: false, error: "Model not found" });
    return;
  }
  store.removeByField("entries", "modelId", modelId, req.user!.companyId);
  res.json({ success: true });
});

export default router;
