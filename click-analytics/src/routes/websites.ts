import { Router } from "express";
import { requireAdminKey } from "../middleware/auth";
import { validateBody } from "../middleware/validation";
import { CreateWebsiteSchema, UpdateDomainsSchema } from "../types";
import {
  createWebsite,
  listWebsitesByOwner,
  getWebsiteById,
  updateAllowedDomains,
  rotateKeys,
  deactivateWebsite,
} from "../services/apikeys";

const router = Router();

router.use(requireAdminKey);

router.post("/", validateBody(CreateWebsiteSchema), async (req, res, next) => {
  try {
    const website = await createWebsite(req.body);
    res.status(201).json({
      id: website.id,
      name: website.name,
      allowedDomains: website.allowed_domains,
      siteKey: website.site_key,
      secretKey: website.secret_key,
      ownerEmail: website.owner_email,
      createdAt: website.created_at,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const ownerEmail = req.query.ownerEmail as string | undefined;
    if (!ownerEmail) {
      res.status(400).json({ error: "ownerEmail query param required" });
      return;
    }

    const websites = await listWebsitesByOwner(ownerEmail);
    res.json(
      websites.map((w) => ({
        id: w.id,
        name: w.name,
        allowedDomains: w.allowed_domains,
        siteKey: w.site_key,
        ownerEmail: w.owner_email,
        createdAt: w.created_at,
      }))
    );
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const website = await getWebsiteById(req.params.id);
    if (!website) {
      res.status(404).json({ error: "Website not found" });
      return;
    }

    res.json({
      id: website.id,
      name: website.name,
      allowedDomains: website.allowed_domains,
      siteKey: website.site_key,
      secretKey: website.secret_key,
      ownerEmail: website.owner_email,
      createdAt: website.created_at,
    });
  } catch (err) {
    next(err);
  }
});

router.put(
  "/:id/domains",
  validateBody(UpdateDomainsSchema),
  async (req, res, next) => {
    try {
      const updated = await updateAllowedDomains(
        req.params.id,
        req.body.allowedDomains
      );
      if (!updated) {
        res.status(404).json({ error: "Website not found" });
        return;
      }

      res.json({
        id: updated.id,
        allowedDomains: updated.allowed_domains,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post("/:id/rotate-keys", async (req, res, next) => {
  try {
    const keys = await rotateKeys(req.params.id);
    if (!keys) {
      res.status(404).json({ error: "Website not found" });
      return;
    }

    res.json(keys);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const ok = await deactivateWebsite(req.params.id);
    if (!ok) {
      res.status(404).json({ error: "Website not found" });
      return;
    }
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

export default router;
