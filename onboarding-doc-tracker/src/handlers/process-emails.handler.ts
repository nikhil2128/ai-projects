import { S3Event } from '../types';
import { config } from '../config';
import { processEmailFromS3, ProcessingRunResult } from '../services/processing.service';
import { mapWithConcurrency } from '../utils/resilience';

interface LambdaResponse {
  statusCode: number;
  body: string;
}

/**
 * AWS Lambda handler triggered by S3 PutObject events.
 * SES deposits raw emails into S3, which triggers this function
 * to parse, upload documents to OneDrive, and notify HR.
 *
 * Records are processed concurrently (bounded by EMAIL_CONCURRENCY)
 * to handle bursts when many employees submit documents simultaneously.
 */
export async function handler(event: S3Event): Promise<LambdaResponse> {
  const startTime = Date.now();

  const settled = await mapWithConcurrency(
    event.Records,
    config.processing.emailConcurrency,
    async (record) => {
      const { bucket, object } = record.s3;
      return processEmailFromS3(bucket.name, object.key);
    }
  );

  const results: ProcessingRunResult[] = [];
  for (const outcome of settled) {
    if (outcome.status === 'fulfilled') {
      results.push(outcome.value);
    } else {
      const errorMessage = outcome.reason instanceof Error
        ? outcome.reason.message
        : String(outcome.reason);
      results.push({ success: false, messageId: 'unknown', error: errorMessage });
    }
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

  if (failed === results.length && results.length > 0) {
    throw new Error(
      `All ${failed} email(s) failed processing. ` +
      `Throwing to trigger Lambda retry. Errors: ${results.map((r) => r.error).join('; ')}`
    );
  }

  return {
    statusCode: failed > 0 ? 207 : 200,
    body: JSON.stringify(summary, null, 2),
  };
}
