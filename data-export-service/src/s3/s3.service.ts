import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  private s3!: S3Client;
  private bucket!: string;
  private presignExpires!: number;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const endpoint = this.configService.get<string>('s3.endpoint');
    this.bucket = this.configService.get<string>('s3.bucket', 'data-exports');
    this.presignExpires = this.configService.get<number>('s3.presignExpiresSeconds', 604800);

    this.s3 = new S3Client({
      endpoint,
      region: this.configService.get<string>('s3.region', 'us-east-1'),
      credentials: {
        accessKeyId: this.configService.get<string>('s3.accessKey', ''),
        secretAccessKey: this.configService.get<string>('s3.secretKey', ''),
      },
      forcePathStyle: this.configService.get<boolean>('s3.forcePathStyle', true),
    });

    this.logger.log(`S3 configured → bucket=${this.bucket}, endpoint=${endpoint}`);
  }

  /**
   * Streams a readable (e.g. file stream) to S3 using multipart upload.
   * Suitable for large files — never holds the entire file in memory.
   */
  async uploadStream(key: string, body: Readable, contentType = 'text/csv'): Promise<string> {
    const upload = new Upload({
      client: this.s3,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ContentDisposition: `attachment; filename="${key.split('/').pop()}"`,
      },
      queueSize: 4,
      partSize: 10 * 1024 * 1024, // 10 MB parts
    });

    upload.on('httpUploadProgress', (progress) => {
      this.logger.debug(`Upload progress for ${key}: ${JSON.stringify(progress)}`);
    });

    await upload.done();
    this.logger.log(`Uploaded ${key} to S3`);
    return key;
  }

  async getPresignedUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3, command, { expiresIn: this.presignExpires });
  }

  async deleteObject(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
