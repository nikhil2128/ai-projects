import { Router, type Request, type Response } from "express";
import * as store from "../store.js";

const router = Router();

router.get("/localization", (_req: Request, res: Response) => {
  const settings = store.getLocalizationSettings(_req.user!.companyId);
  res.json({ success: true, data: settings });
});

router.put("/localization", (req: Request, res: Response) => {
  const { enabledLocales } = req.body;

  if (!Array.isArray(enabledLocales)) {
    res.status(400).json({
      success: false,
      error: "enabledLocales must be an array",
    });
    return;
  }

  const settings = store.updateLocalizationSettings(
    req.user!.companyId,
    enabledLocales,
  );
  res.json({ success: true, data: settings });
});

export default router;
