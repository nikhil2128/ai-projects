import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import * as sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';

export interface UploadResult {
  key: string;
  url: string;
  thumbnailKey: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  size: number;
}

interface ThumbnailSpec {
  suffix: string;
  width: number;
  height: number;
}

const THUMBNAIL_SIZES: ThumbnailSpec[] = [
  { suffix: 'sm', width: 150, height: 150 },
  { suffix: 'md', width: 480, height: 480 },
  { suffix: 'lg', width: 1080, height: 1080 },
];

@Injectable()
export class StorageService implements OnModuleInit {
  private s3!: S3Client;
  private bucket!: string;
  private thumbnailBucket!: string;
  private cdnUrl!: string;
  private cdnThumbnailUrl!: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const endpoint = this.configService.get<string>('S3_ENDPOINT', 'http://localhost:9000');
    this.bucket = this.configService.get<string>('S3_BUCKET', 'photoshare-images');
    this.thumbnailBucket = this.configService.get<string>('S3_THUMBNAIL_BUCKET', 'photoshare-thumbnails');
    this.cdnUrl = this.configService.get<string>('CDN_URL', `${endpoint}/${this.bucket}`);
    this.cdnThumbnailUrl = this.configService.get<string>('CDN_THUMBNAIL_URL', `${endpoint}/${this.thumbnailBucket}`);

    this.s3 = new S3Client({
      endpoint,
      region: this.configService.get<string>('S3_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.configService.get<string>('S3_ACCESS_KEY', 'minioadmin'),
        secretAccessKey: this.configService.get<string>('S3_SECRET_KEY', 'minioadmin123'),
      },
      forcePathStyle: true,
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    userId: number,
  ): Promise<UploadResult> {
    const id = uuidv4();
    const ext = extname(file.originalname).toLowerCase();
    const key = `${userId}/${id}${ext}`;

    const metadata = await sharp(file.buffer).metadata();

    // Convert to WebP for optimal delivery while keeping original
    const webpBuffer = await sharp(file.buffer)
      .webp({ quality: 85, effort: 4 })
      .toBuffer();

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: webpBuffer,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
        Metadata: {
          'original-name': file.originalname,
          'user-id': String(userId),
        },
      }),
    );

    // Generate thumbnails in parallel
    const thumbnailKey = `${userId}/${id}`;
    await Promise.all(
      THUMBNAIL_SIZES.map(async (spec) => {
        const thumb = await sharp(file.buffer)
          .resize(spec.width, spec.height, { fit: 'cover', position: 'centre' })
          .webp({ quality: 80 })
          .toBuffer();

        await this.s3.send(
          new PutObjectCommand({
            Bucket: this.thumbnailBucket,
            Key: `${thumbnailKey}_${spec.suffix}.webp`,
            Body: thumb,
            ContentType: 'image/webp',
            CacheControl: 'public, max-age=31536000, immutable',
          }),
        );
      }),
    );

    return {
      key,
      url: `${this.cdnUrl}/${key}`,
      thumbnailKey,
      thumbnailUrl: `${this.cdnThumbnailUrl}/${thumbnailKey}_md.webp`,
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
      size: webpBuffer.length,
    };
  }

  async deleteImage(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );

    const basePath = key.replace(/\.[^.]+$/, '');
    await Promise.all(
      THUMBNAIL_SIZES.map((spec) =>
        this.s3.send(
          new DeleteObjectCommand({
            Bucket: this.thumbnailBucket,
            Key: `${basePath}_${spec.suffix}.webp`,
          }),
        ),
      ),
    );
  }

  getImageUrl(key: string): string {
    return `${this.cdnUrl}/${key}`;
  }

  getThumbnailUrl(key: string, size: 'sm' | 'md' | 'lg' = 'md'): string {
    const basePath = key.replace(/\.[^.]+$/, '');
    return `${this.cdnThumbnailUrl}/${basePath}_${size}.webp`;
  }
}
