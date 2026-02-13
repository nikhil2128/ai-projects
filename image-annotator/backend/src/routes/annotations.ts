import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import {
  AnnotationService,
  createAnnotationSchema,
  updateAnnotationSchema,
} from '../services/annotation.service';
import { getIO } from '../socket';

const router = Router();
const annotationService = new AnnotationService();

// GET /api/images/:imageId/annotations
router.get('/images/:imageId/annotations', authenticate, async (req: Request, res: Response) => {
  try {
    const annotations = await annotationService.listAnnotations(req.params.imageId);
    res.json(annotations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list annotations' });
  }
});

// POST /api/images/:imageId/annotations
router.post('/images/:imageId/annotations', authenticate, async (req: Request, res: Response) => {
  try {
    const input = createAnnotationSchema.parse(req.body);
    const annotation = await annotationService.createAnnotation(
      req.params.imageId,
      req.user!.userId,
      input
    );

    // Broadcast to all clients viewing this image
    const io = getIO();
    io.to(`image:${req.params.imageId}`).emit('annotation:created', annotation);

    res.status(201).json(annotation);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    if (error.message === 'Image not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to create annotation' });
  }
});

// PATCH /api/annotations/:id
router.patch('/annotations/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const input = updateAnnotationSchema.parse(req.body);
    const annotation = await annotationService.updateAnnotation(
      req.params.id,
      req.user!.userId,
      req.user!.role,
      input
    );

    // Broadcast update
    const io = getIO();
    io.to(`image:${annotation.imageId}`).emit('annotation:updated', annotation);

    res.json(annotation);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    if (error.message === 'Annotation not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error.message?.includes('Not authorized')) {
      res.status(403).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to update annotation' });
  }
});

// DELETE /api/annotations/:id
router.delete('/annotations/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await annotationService.deleteAnnotation(
      req.params.id,
      req.user!.userId,
      req.user!.role
    );

    // Broadcast deletion to image room
    const io = getIO();
    io.to(`image:${result.imageId}`).emit('annotation:deleted', {
      annotationId: req.params.id,
    });

    res.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Annotation not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error.message?.includes('Not authorized')) {
      res.status(403).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to delete annotation' });
  }
});

export default router;
