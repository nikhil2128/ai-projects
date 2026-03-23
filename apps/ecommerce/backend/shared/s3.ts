import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

const REGION = process.env.AWS_REGION ?? "us-east-1";
const BUCKET = process.env.CSV_UPLOAD_BUCKET ?? "ecommerce-csv-uploads";
const PRESIGN_EXPIRY = 300; // 5 minutes

const client = new S3Client({ region: REGION });

export function getBucket(): string {
  return BUCKET;
}

export async function generatePresignedUploadUrl(
  key: string,
  contentType = "text/csv"
): Promise<{ url: string; key: string }> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(client, command, { expiresIn: PRESIGN_EXPIRY });
  return { url, key };
}

export async function getObjectAsString(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const response = await client.send(command);

  if (!response.Body) {
    throw new Error(`Empty response body for S3 key: ${key}`);
  }

  const stream = response.Body as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

export async function getObjectLineStream(key: string): Promise<Readable> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const response = await client.send(command);

  if (!response.Body) {
    throw new Error(`Empty response body for S3 key: ${key}`);
  }

  return response.Body as Readable;
}

export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
  await client.send(command);
}

export function buildCsvKey(sellerId: string, jobId: string, fileName: string): string {
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `uploads/${sellerId}/${jobId}/${sanitized}`;
}
