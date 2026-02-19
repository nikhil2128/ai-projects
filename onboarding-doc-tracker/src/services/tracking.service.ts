import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
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
  record: TrackingRecord,
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
        }),
      ),
    dynamoRetryOpts,
  );
}

/**
 * Checks if a message was already processed. Verifies both messageId and
 * tenantId to prevent a crafted messageId from masquerading as another
 * tenant's already-processed record.
 */
export async function isAlreadyProcessed(
  messageId: string,
  tenantId: string,
): Promise<boolean> {
  const response = await withRetry(
    () =>
      docClient.send(
        new GetCommand({
          TableName: TABLE,
          Key: { messageId },
          ProjectionExpression: '#s, tenantId',
          ExpressionAttributeNames: { '#s': 'status' },
        }),
      ),
    dynamoRetryOpts,
  );

  if (!response.Item) return false;

  if (response.Item.tenantId !== tenantId) {
    console.error(
      JSON.stringify({
        level: 'SECURITY',
        event: 'cross_tenant_duplicate_check',
        messageId,
        expectedTenant: tenantId,
        foundTenant: response.Item.tenantId,
      }),
    );
    return false;
  }

  return response.Item.status === 'processed';
}

/**
 * Returns all tracking records for a specific tenant, ensuring strict
 * tenant isolation via the tenantId-index GSI.
 */
export async function getRecordsByTenant(
  tenantId: string,
): Promise<TrackingRecord[]> {
  const response = await withRetry(
    () =>
      docClient.send(
        new QueryCommand({
          TableName: TABLE,
          IndexName: 'tenantId-index',
          KeyConditionExpression: 'tenantId = :tid',
          ExpressionAttributeValues: { ':tid': tenantId },
        }),
      ),
    dynamoRetryOpts,
  );

  return (response.Items as TrackingRecord[]) || [];
}

export async function recordFailure(
  tenantId: string,
  messageId: string,
  employeeName: string,
  employeeEmail: string,
  error: string,
): Promise<void> {
  try {
    await withRetry(
      () =>
        docClient.send(
          new PutCommand({
            TableName: TABLE,
            Item: {
              tenantId,
              messageId,
              employeeName,
              employeeEmail,
              status: 'failed',
              error,
              processedAt: new Date().toISOString(),
              folderUrl: '',
              documentsUploaded: [],
            } satisfies TrackingRecord,
          }),
        ),
      dynamoRetryOpts,
    );
  } catch (err) {
    console.error('Failed to record failure in DynamoDB:', err);
  }
}
