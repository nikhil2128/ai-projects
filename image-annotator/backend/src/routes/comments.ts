import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { CommentService, createCommentSchema } from '../services/comment.service';
import { getIO } from '../socket';

const router = Router();
const commentService = new CommentService();
const prisma = new PrismaClient();

// GET /api/annotations/:annotationId/comments
router.get(
  '/annotations/:annotationId/comments',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const comments = await commentService.listComments(req.params.annotationId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ error: 'Failed to list comments' });
    }
  }
);

// POST /api/annotations/:annotationId/comments
router.post(
  '/annotations/:annotationId/comments',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const input = createCommentSchema.parse(req.body);
      const comment = await commentService.createComment(
        req.params.annotationId,
        req.user!.userId,
        input
      );

      // Broadcast to image room
      const io = getIO();
      const annotation = await prisma.annotation.findUnique({
        where: { id: req.params.annotationId },
        select: { imageId: true },
      });

      if (annotation) {
        io.to(`image:${annotation.imageId}`).emit('comment:created', {
          ...comment,
          annotationId: req.params.annotationId,
        });
      }

      res.status(201).json(comment);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      if (error.message === 'Annotation not found') {
        res.status(404).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to create comment' });
    }
  }
);

// DELETE /api/comments/:id
router.delete('/comments/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await commentService.deleteComment(
      req.params.id,
      req.user!.userId,
      req.user!.role
    );

    // Broadcast deletion
    const io = getIO();
    const annotation = await prisma.annotation.findUnique({
      where: { id: result.annotationId },
      select: { imageId: true },
    });

    if (annotation) {
      io.to(`image:${annotation.imageId}`).emit('comment:deleted', {
        commentId: req.params.id,
        annotationId: result.annotationId,
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Comment not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error.message?.includes('Not authorized')) {
      res.status(403).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

export default router;
