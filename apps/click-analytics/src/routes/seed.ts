import { Router } from "express";
import { seedSampleData } from "../services/seed";

const router = Router();

router.post("/seed", async (req, res, next) => {
  try {
    const count = Math.min(
      parseInt(req.query.count as string, 10) || 2000,
      10000
    );
    const result = await seedSampleData(count);
    res.json({
      message: `Seeded ${result.inserted} sample click events`,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
