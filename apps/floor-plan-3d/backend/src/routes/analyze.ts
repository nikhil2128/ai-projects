import { Router, Request, Response } from 'express';
import multer from 'multer';
import { config } from '../config';
import { analyzeFloorPlan } from '../services/floor-plan-analyzer';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxFileSize },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, and GIF images are supported'));
    }
  },
});

router.post('/', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No image file provided' });
      return;
    }

    const floorPlan = await analyzeFloorPlan(req.file.buffer, req.file.mimetype);

    res.json(floorPlan);
  } catch (err) {
    console.error('Floor plan analysis error:', err);

    if (err instanceof multer.MulterError) {
      res.status(400).json({ error: `Upload error: ${err.message}` });
      return;
    }

    const message = err instanceof Error ? err.message : 'Analysis failed';
    res.status(500).json({ error: message });
  }
});

export default router;
