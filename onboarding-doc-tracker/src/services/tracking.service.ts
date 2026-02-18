import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  BatchGetCommand,
} from '@aws-sdk/lib-dynamodb';
import { config } from '../config';
import { TrackingRecord } from '../types';

const ddbClient = new DynamoDBClient({ region: config.aws.region });
const docClient = DynamoDBDocumentClient.from(ddbClient);

const TABLE = config.aws.dynamoTable;

export async function saveProcessingRecord(
  record: TrackingRecord
): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: record,
      ConditionExpression: 'attribute_not_exists(messageId)',
    })
  );
}

export async function getProcessedMessageIds(
  messageIds: string[]
): Promise<Set<string>> {
  if (messageIds.length === 0) return new Set();

  // BatchGetItem supports max 100 keys per call
  const chunks: string[][] = [];
  for (let i = 0; i < messageIds.length; i += 100) {
    chunks.push(messageIds.slice(i, i + 100));
  }

  const processed = new Set<string>();

  for (const chunk of chunks) {
    const response = await docClient.send(
      new BatchGetCommand({
        RequestItems: {
          [TABLE]: {
            Keys: chunk.map((id) => ({ messageId: id })),
            ProjectionExpression: 'messageId',
          },
        },
      })
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
  const result = await getProcessedMessageIds([messageId]);
  return result.has(messageId);
}

export async function recordFailure(
  messageId: string,
  employeeName: string,
  employeeEmail: string,
  error: string
): Promise<void> {
  try {
    await docClient.send(
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
    );
  } catch (err) {
    console.error('Failed to record failure in DynamoDB:', err);
  }
}
