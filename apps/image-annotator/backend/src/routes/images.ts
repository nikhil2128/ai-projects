import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { ImageService } from '../services/image.service';
import { z } from 'zod';

const router = Router();
const imageService = new ImageService();

const uploadTitleSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

// POST /api/images — Upload a new image
router.post('/', authenticate, upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No image file provided' });
      return;
    }

    const { title, description } = uploadTitleSchema.parse(req.body);
    const image = await imageService.uploadImage(req.file, title, description, req.user!.userId);
    res.status(201).json(image);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// GET /api/images — List images (paginated)
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const result = await imageService.listImages(page, limit);
    res.json(result);
  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({ error: 'Failed to list images' });
  }
});

// GET /api/images/:id — Get image with annotations
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const image = await imageService.getImage(req.params.id);
    res.json(image);
  } catch (error: any) {
    if (error.message === 'Image not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to get image' });
  }
});

// GET /api/images/:id/file — Serve original image file
router.get('/:id/file', authenticate, async (req: Request, res: Response) => {
  try {
    const image = await imageService.getImage(req.params.id);
    const filePath = imageService.getFilePath(image.storageKey);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(filePath);
  } catch (error: any) {
    if (error.message === 'Image not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to serve image' });
  }
});

// GET /api/images/:id/thumbnail — Serve thumbnail
router.get('/:id/thumbnail', authenticate, async (req: Request, res: Response) => {
  try {
    const image = await imageService.getImage(req.params.id);
    const filePath = imageService.getFilePath(image.thumbnailKey);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(filePath);
  } catch (error: any) {
    if (error.message === 'Image not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to serve thumbnail' });
  }
});

// DELETE /api/images/:id
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await imageService.deleteImage(
      req.params.id,
      req.user!.userId,
      req.user!.role
    );
    res.json(result);
  } catch (error: any) {
    if (error.message === 'Image not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error.message === 'Not authorized to delete this image') {
      res.status(403).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

export default router;
