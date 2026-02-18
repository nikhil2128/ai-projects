import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  BatchGetCommand,
} from '@aws-sdk/lib-dynamodb';
import { config } from '../config';
import { TrackingRecord } from '../types';
import { withRetry } from '../utils/resilience';

const ddbClient = new DynamoDBClient({ region: config.aws.region });
const docClient = DynamoDBDocumentClient.from(ddbClient);

const TABLE = config.aws.dynamoTable;

const dynamoRetryOpts = {
  maxAttempts: config.processing.retryMaxAttempts,
  baseDelayMs: config.processing.retryBaseDelayMs,
  isRetryable: (error: unknown) => {
    if (error && typeof error === 'object' && 'name' in error) {
      const name = (error as { name: string }).name;
      return (
        name === 'ProvisionedThroughputExceededException' ||
        name === 'ThrottlingException' ||
        name === 'InternalServerError'
      );
    }
    return false;
  },
};

export async function saveProcessingRecord(
  record: TrackingRecord
): Promise<void> {
  await withRetry(
    () =>
      docClient.send(
        new PutCommand({
          TableName: TABLE,
          Item: record,
          ConditionExpression:
            'attribute_not_exists(messageId) OR #s = :failed',
          ExpressionAttributeNames: { '#s': 'status' },
          ExpressionAttributeValues: { ':failed': 'failed' },
        })
      ),
    dynamoRetryOpts
  );
}

export async function getProcessedMessageIds(
  messageIds: string[]
): Promise<Set<string>> {
  if (messageIds.length === 0) return new Set();

  const chunks: string[][] = [];
  for (let i = 0; i < messageIds.length; i += 100) {
    chunks.push(messageIds.slice(i, i + 100));
  }

  const processed = new Set<string>();

  for (const chunk of chunks) {
    const response = await withRetry(
      () =>
        docClient.send(
          new BatchGetCommand({
            RequestItems: {
              [TABLE]: {
                Keys: chunk.map((id) => ({ messageId: id })),
                ProjectionExpression: 'messageId',
              },
            },
          })
        ),
      dynamoRetryOpts
    );

    const items = response.Responses?.[TABLE] || [];
    for (const item of items) {
      processed.add(item.messageId as string);
    }
  }

  return processed;
}

export async function isAlreadyProcessed(
  messageId: string
): Promise<boolean> {
  const response = await withRetry(
    () =>
      docClient.send(
        new GetCommand({
          TableName: TABLE,
          Key: { messageId },
          ProjectionExpression: '#s',
          ExpressionAttributeNames: { '#s': 'status' },
        })
      ),
    dynamoRetryOpts
  );
  return response.Item?.status === 'processed';
}

export async function recordFailure(
  messageId: string,
  employeeName: string,
  employeeEmail: string,
  error: string
): Promise<void> {
  try {
    await withRetry(
      () =>
        docClient.send(
          new PutCommand({
            TableName: TABLE,
            Item: {
              messageId,
              employeeName,
              employeeEmail,
              status: 'failed',
              error,
              processedAt: new Date().toISOString(),
              folderUrl: '',
              documentsUploaded: [],
            } satisfies TrackingRecord,
          })
        ),
      dynamoRetryOpts
    );
  } catch (err) {
    console.error('Failed to record failure in DynamoDB:', err);
  }
}
