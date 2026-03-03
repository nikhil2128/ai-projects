import { Router } from "express";
import { z } from "zod";
import { ClickEventSchema } from "../types";
import { validateBody } from "../middleware/validation";
import { insertClick, insertClicksBatch } from "../services/tracking";

const router = Router();

router.post("/track", validateBody(ClickEventSchema), (req, res) => {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || null;
  const click = insertClick(req.body, ip);
  res.status(201).json({ id: click.id, createdAt: click.createdAt });
});

const BatchSchema = z.object({
  events: z.array(ClickEventSchema).min(1).max(1000),
});

router.post("/track/batch", validateBody(BatchSchema), (req, res) => {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || null;
  const count = insertClicksBatch(req.body.events, ip);
  res.status(201).json({ inserted: count });
});

export default router;
