import { SQSEvent, SQSBatchResponse, S3Event } from '../types';
import { processEmailFromS3 } from '../services/processing.service';

/**
 * AWS Lambda handler triggered by SQS messages.
 *
 * Flow: SES → S3 → SQS → this Lambda
 *
 * Each SQS message wraps an S3 event notification. The handler processes
 * messages concurrently and reports individual failures via batchItemFailures,
 * so SQS only retries the specific messages that failed. Messages that
 * exhaust their maxReceiveCount land in the dead-letter queue.
 */
export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  const batchItemFailures: SQSBatchResponse['batchItemFailures'] = [];

  const outcomes = await Promise.allSettled(
    event.Records.map(async (sqsRecord) => {
      const receiveCount = parseInt(sqsRecord.attributes.ApproximateReceiveCount, 10);
      if (receiveCount > 1) {
        console.warn(
          `Retry attempt ${receiveCount} for SQS message ${sqsRecord.messageId}`
        );
      }

      const s3Event: S3Event = JSON.parse(sqsRecord.body);
      const s3Record = s3Event.Records[0];
      const { bucket, object } = s3Record.s3;

      const result = await processEmailFromS3(bucket.name, object.key);

      if (!result.success) {
        throw new Error(result.error ?? `Processing failed for ${object.key}`);
      }

      return result;
    })
  );

  for (let i = 0; i < outcomes.length; i++) {
    const outcome = outcomes[i];
    if (outcome.status === 'rejected') {
      const error = outcome.reason instanceof Error
        ? outcome.reason.message
        : String(outcome.reason);
      console.error(
        `SQS message ${event.Records[i].messageId} failed: ${error}`
      );
      batchItemFailures.push({ itemIdentifier: event.Records[i].messageId });
    }
  }

  console.log(JSON.stringify({
    total: event.Records.length,
    succeeded: event.Records.length - batchItemFailures.length,
    failed: batchItemFailures.length,
  }));

  return { batchItemFailures };
}
