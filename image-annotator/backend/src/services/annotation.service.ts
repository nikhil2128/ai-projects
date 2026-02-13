import { PrismaClient, AnnotationStatus } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

export const createAnnotationSchema = z.object({
  centerX: z.number().min(0).max(100),
  centerY: z.number().min(0).max(100),
  radius: z.number().min(0.5).max(50),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .optional()
    .default('#FF0000'),
  label: z.string().max(200).optional(),
});

export const updateAnnotationSchema = z.object({
  centerX: z.number().min(0).max(100).optional(),
  centerY: z.number().min(0).max(100).optional(),
  radius: z.number().min(0.5).max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  label: z.string().max(200).optional(),
  status: z.nativeEnum(AnnotationStatus).optional(),
});

export type CreateAnnotationInput = z.infer<typeof createAnnotationSchema>;
export type UpdateAnnotationInput = z.infer<typeof updateAnnotationSchema>;

const annotationInclude = {
  author: {
    select: { id: true, name: true, role: true, department: true },
  },
  comments: {
    include: {
      author: {
        select: { id: true, name: true, role: true, department: true },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
};

export class AnnotationService {
  async createAnnotation(imageId: string, authorId: string, input: CreateAnnotationInput) {
    // Verify image exists
    const image = await prisma.image.findUnique({ where: { id: imageId } });
    if (!image) {
      throw new Error('Image not found');
    }

    const annotation = await prisma.annotation.create({
      data: {
        imageId,
        authorId,
        centerX: input.centerX,
        centerY: input.centerY,
        radius: input.radius,
        color: input.color,
        label: input.label,
      },
      include: annotationInclude,
    });

    return annotation;
  }

  async listAnnotations(imageId: string) {
    return prisma.annotation.findMany({
      where: { imageId },
      include: annotationInclude,
      orderBy: { createdAt: 'asc' },
    });
  }

  async getAnnotation(annotationId: string) {
    const annotation = await prisma.annotation.findUnique({
      where: { id: annotationId },
      include: annotationInclude,
    });

    if (!annotation) {
      throw new Error('Annotation not found');
    }

    return annotation;
  }

  async updateAnnotation(annotationId: string, userId: string, userRole: string, input: UpdateAnnotationInput) {
    const annotation = await prisma.annotation.findUnique({
      where: { id: annotationId },
    });

    if (!annotation) {
      throw new Error('Annotation not found');
    }

    // Only author or admin can update position/color; anyone can update status
    const isStatusOnlyUpdate =
      Object.keys(input).length === 1 && input.status !== undefined;

    if (!isStatusOnlyUpdate && annotation.authorId !== userId && userRole !== 'ADMIN') {
      throw new Error('Not authorized to update this annotation');
    }

    const updated = await prisma.annotation.update({
      where: { id: annotationId },
      data: input,
      include: annotationInclude,
    });

    return updated;
  }

  async deleteAnnotation(annotationId: string, userId: string, userRole: string) {
    const annotation = await prisma.annotation.findUnique({
      where: { id: annotationId },
    });

    if (!annotation) {
      throw new Error('Annotation not found');
    }

    if (annotation.authorId !== userId && userRole !== 'ADMIN') {
      throw new Error('Not authorized to delete this annotation');
    }

    await prisma.annotation.delete({ where: { id: annotationId } });
    return { success: true, imageId: annotation.imageId };
  }
}
