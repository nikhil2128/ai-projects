import {
  SQSClient,
  SendMessageCommand,
  SendMessageBatchCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  Message,
} from "@aws-sdk/client-sqs";

const REGION = process.env.AWS_REGION ?? "us-east-1";
const client = new SQSClient({ region: REGION });

export const CSV_QUEUE_URL =
  process.env.CSV_PROCESSING_QUEUE_URL ?? "https://sqs.us-east-1.amazonaws.com/000000000000/csv-processing";

export const CSV_DLQ_URL =
  process.env.CSV_DLQ_URL ?? "https://sqs.us-east-1.amazonaws.com/000000000000/csv-processing-dlq";

const MAX_BATCH_ENTRIES = 10;

export async function sendMessage<T>(queueUrl: string, body: T, deduplicationId?: string): Promise<void> {
  const command = new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(body),
    ...(deduplicationId && { MessageDeduplicationId: deduplicationId }),
  });
  await client.send(command);
}

export async function sendMessageBatch<T>(queueUrl: string, messages: T[]): Promise<void> {
  for (let offset = 0; offset < messages.length; offset += MAX_BATCH_ENTRIES) {
    const batch = messages.slice(offset, offset + MAX_BATCH_ENTRIES);

    const command = new SendMessageBatchCommand({
      QueueUrl: queueUrl,
      Entries: batch.map((msg, idx) => ({
        Id: `msg-${offset + idx}`,
        MessageBody: JSON.stringify(msg),
      })),
    });

    await client.send(command);
  }
}

export async function receiveMessages(
  queueUrl: string,
  maxMessages = 10,
  waitTimeSeconds = 20,
  visibilityTimeout = 120
): Promise<Message[]> {
  const command = new ReceiveMessageCommand({
    QueueUrl: queueUrl,
    MaxNumberOfMessages: Math.min(maxMessages, 10),
    WaitTimeSeconds: waitTimeSeconds,
    VisibilityTimeout: visibilityTimeout,
    MessageSystemAttributeNames: ["ApproximateReceiveCount"],
  });

  const response = await client.send(command);
  return response.Messages ?? [];
}

export async function deleteMessage(queueUrl: string, receiptHandle: string): Promise<void> {
  const command = new DeleteMessageCommand({
    QueueUrl: queueUrl,
    ReceiptHandle: receiptHandle,
  });
  await client.send(command);
}

export function parseMessageBody<T>(message: Message): T {
  if (!message.Body) {
    throw new Error("SQS message has no body");
  }
  return JSON.parse(message.Body) as T;
}

export function getReceiveCount(message: Message): number {
  return parseInt(message.Attributes?.ApproximateReceiveCount ?? "1", 10);
}
