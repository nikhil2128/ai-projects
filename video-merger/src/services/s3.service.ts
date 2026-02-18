import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { createWriteStream, createReadStream } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { config } from '../config';

let s3Client: S3Client | null = null;

function getClient(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: config.aws.region,
      ...(config.aws.accessKeyId && config.aws.secretAccessKey
        ? {
            credentials: {
              accessKeyId: config.aws.accessKeyId,
              secretAccessKey: config.aws.secretAccessKey,
            },
          }
        : {}),
    });
  }
  return s3Client;
}

/**
 * List all video chunk keys under a given S3 prefix.
 * Only includes files with common video extensions.
 */
export async function listChunkKeys(
  bucket: string,
  prefix: string
): Promise<string[]> {
  const client = getClient();
  const keys: string[] = [];
  let continuationToken: string | undefined;

  const videoExtensions = ['.mp4', '.webm', '.mkv', '.mov', '.avi', '.ts'];

  do {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });

    const response = await client.send(command);

    if (response.Contents) {
      for (const obj of response.Contents) {
        if (obj.Key) {
          const ext = path.extname(obj.Key).toLowerCase();
          if (videoExtensions.includes(ext)) {
            keys.push(obj.Key);
          }
        }
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return keys;
}

/**
 * Download a single S3 object to a local file path.
 * Creates parent directories if they don't exist.
 */
export async function downloadFile(
  bucket: string,
  key: string,
  destPath: string
): Promise<void> {
  const client = getClient();

  await mkdir(path.dirname(destPath), { recursive: true });

  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await client.send(command);

  if (!response.Body) {
    throw new Error(`Empty response body for S3 key: ${key}`);
  }

  const readableBody = response.Body as Readable;
  const writeStream = createWriteStream(destPath);

  await pipeline(readableBody, writeStream);
}

/**
 * Upload a local file to S3 using multipart upload for large files.
 */
export async function uploadFile(
  bucket: string,
  key: string,
  localPath: string,
  contentType: string = 'video/mp4'
): Promise<string> {
  const client = getClient();

  const upload = new Upload({
    client,
    params: {
      Bucket: bucket,
      Key: key,
      Body: createReadStream(localPath),
      ContentType: contentType,
    },
    queueSize: 4,
    partSize: 10 * 1024 * 1024, // 10 MB parts
  });

  await upload.done();

  return `s3://${bucket}/${key}`;
}
