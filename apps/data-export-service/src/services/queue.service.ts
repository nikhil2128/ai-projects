import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { getConfig } from '../config';

let sqsClient: SQSClient | null = null;

function getClient(): SQSClient {
  if (!sqsClient) {
    const cfg = getConfig();
    sqsClient = new SQSClient({ region: cfg.sqs.region });
  }
  return sqsClient;
}

export function resetClient(): void {
  sqsClient = null;
}

export async function enqueueExportJob(exportJobId: string): Promise<void> {
  const cfg = getConfig();
  await getClient().send(
    new SendMessageCommand({
      QueueUrl: cfg.sqs.queueUrl,
      MessageBody: JSON.stringify({ exportJobId }),
    }),
  );
}
