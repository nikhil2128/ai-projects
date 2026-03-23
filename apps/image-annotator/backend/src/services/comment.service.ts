import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

export const createCommentSchema = z.object({
  body: z.string().min(1, 'Comment body is required').max(5000),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export class CommentService {
  async createComment(annotationId: string, authorId: string, input: CreateCommentInput) {
    // Verify annotation exists
    const annotation = await prisma.annotation.findUnique({
      where: { id: annotationId },
    });

    if (!annotation) {
      throw new Error('Annotation not found');
    }

    const comment = await prisma.comment.create({
      data: {
        annotationId,
        authorId,
        body: input.body,
      },
      include: {
        author: {
          select: { id: true, name: true, role: true, department: true },
        },
      },
    });

    return comment;
  }

  async listComments(annotationId: string) {
    return prisma.comment.findMany({
      where: { annotationId },
      include: {
        author: {
          select: { id: true, name: true, role: true, department: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteComment(commentId: string, userId: string, userRole: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.authorId !== userId && userRole !== 'ADMIN') {
      throw new Error('Not authorized to delete this comment');
    }

    await prisma.comment.delete({ where: { id: commentId } });
    return { success: true, annotationId: comment.annotationId };
  }
}
