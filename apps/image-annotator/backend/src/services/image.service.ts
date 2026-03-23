import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config';

const prisma = new PrismaClient();

export class ImageService {
  async uploadImage(
    file: Express.Multer.File,
    title: string,
    description: string | undefined,
    uploaderId: string
  ) {
    // Get image dimensions
    const metadata = await sharp(file.path).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    // Generate thumbnail
    const thumbnailFilename = `thumb_${file.filename}`;
    const thumbnailPath = path.join(config.uploadDir, 'thumbnails', thumbnailFilename);

    await sharp(file.path)
      .resize(config.thumbnailWidth, undefined, { withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    const storageKey = `originals/${file.filename}`;
    const thumbnailKey = `thumbnails/${thumbnailFilename}`;

    const image = await prisma.image.create({
      data: {
        title,
        description,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        width,
        height,
        storageKey,
        thumbnailKey,
        uploaderId,
      },
      include: {
        uploader: {
          select: { id: true, name: true, role: true, department: true },
        },
      },
    });

    return image;
  }

  async listImages(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [images, total] = await Promise.all([
      prisma.image.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          uploader: {
            select: { id: true, name: true, role: true, department: true },
          },
          _count: { select: { annotations: true } },
        },
      }),
      prisma.image.count(),
    ]);

    return {
      images,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getImage(imageId: string) {
    const image = await prisma.image.findUnique({
      where: { id: imageId },
      include: {
        uploader: {
          select: { id: true, name: true, role: true, department: true },
        },
        annotations: {
          include: {
            author: {
              select: { id: true, name: true, role: true, department: true },
            },
            comments: {
              include: {
                author: {
                  select: { id: true, name: true, role: true, department: true },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!image) {
      throw new Error('Image not found');
    }

    return image;
  }

  async deleteImage(imageId: string, userId: string, userRole: string) {
    const image = await prisma.image.findUnique({ where: { id: imageId } });

    if (!image) {
      throw new Error('Image not found');
    }

    if (image.uploaderId !== userId && userRole !== 'ADMIN') {
      throw new Error('Not authorized to delete this image');
    }

    // Delete files from disk
    const originalPath = path.join(config.uploadDir, image.storageKey);
    const thumbnailPath = path.join(config.uploadDir, image.thumbnailKey);

    await Promise.allSettled([
      fs.unlink(originalPath),
      fs.unlink(thumbnailPath),
    ]);

    // Delete from database (cascades to annotations and comments)
    await prisma.image.delete({ where: { id: imageId } });

    return { success: true };
  }

  getFilePath(storageKey: string): string {
    return path.join(config.uploadDir, storageKey);
  }
}
