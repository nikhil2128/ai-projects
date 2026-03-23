import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { getConfig } from '../config';

let s3Client: S3Client | null = null;

function getClient(): S3Client {
  if (!s3Client) {
    const cfg = getConfig();
    s3Client = new S3Client({
      ...(cfg.s3.endpoint && { endpoint: cfg.s3.endpoint }),
      region: cfg.s3.region,
      credentials: {
        accessKeyId: cfg.s3.accessKey,
        secretAccessKey: cfg.s3.secretKey,
      },
      forcePathStyle: cfg.s3.forcePathStyle,
    });
  }
  return s3Client;
}

export function resetClient(): void {
  s3Client = null;
}

export async function uploadStream(
  key: string,
  body: Readable,
  contentType = 'text/csv',
): Promise<string> {
  const cfg = getConfig();
  const upload = new Upload({
    client: getClient(),
    params: {
      Bucket: cfg.s3.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentDisposition: `attachment; filename="${key.split('/').pop()}"`,
    },
    queueSize: 4,
    partSize: 10 * 1024 * 1024,
  });

  await upload.done();
  return key;
}

export async function getPresignedUrl(key: string): Promise<string> {
  const cfg = getConfig();
  const command = new GetObjectCommand({
    Bucket: cfg.s3.bucket,
    Key: key,
  });

  return getSignedUrl(getClient(), command, {
    expiresIn: cfg.s3.presignExpiresSeconds,
  });
}

export async function deleteObject(key: string): Promise<void> {
  const cfg = getConfig();
  await getClient().send(
    new DeleteObjectCommand({ Bucket: cfg.s3.bucket, Key: key }),
  );
}
