import { S3Event } from '../types';
import { processEmailFromS3 } from '../services/processing.service';

interface LambdaResponse {
  statusCode: number;
  body: string;
}

/**
 * AWS Lambda handler triggered by S3 PutObject events.
 * SES deposits raw emails into S3, which triggers this function
 * to parse, upload documents to OneDrive, and notify HR.
 */
export async function handler(event: S3Event): Promise<LambdaResponse> {
  const startTime = Date.now();
  const results = [];

  for (const record of event.Records) {
    const { bucket, object } = record.s3;
    const result = await processEmailFromS3(bucket.name, object.key);
    results.push(result);
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  const summary = {
    duration: `${Date.now() - startTime}ms`,
    total: results.length,
    succeeded,
    failed,
    results,
  };

  if (failed > 0) {
    console.error('Some emails failed processing:', JSON.stringify(summary));
  }

  return {
    statusCode: failed > 0 ? 207 : 200,
    body: JSON.stringify(summary, null, 2),
  };
}
