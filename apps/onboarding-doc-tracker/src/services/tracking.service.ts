import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { config } from '../config';
import { TrackingRecord } from '../types';
import { withRetry } from '../utils/resilience';

const ddbClient = new DynamoDBClient({ region: config.aws.region });
const docClient = DynamoDBDocumentClient.from(ddbClient);

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

export function getTrackingTableName(tenantId: string): string {
  return `${config.aws.dynamoTablePrefix}-${tenantId}`;
}

export async function saveProcessingRecord(
  record: TrackingRecord,
): Promise<void> {
  const tableName = getTrackingTableName(record.tenantId);
  await withRetry(
    () =>
      docClient.send(
        new PutCommand({
          TableName: tableName,
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

export async function isAlreadyProcessed(
  messageId: string,
  tenantId: string,
): Promise<boolean> {
  const tableName = getTrackingTableName(tenantId);
  const response = await withRetry(
    () =>
      docClient.send(
        new GetCommand({
          TableName: tableName,
          Key: { messageId },
          ProjectionExpression: '#s',
          ExpressionAttributeNames: { '#s': 'status' },
        }),
      ),
    dynamoRetryOpts,
  );

  if (!response.Item) return false;
  return response.Item.status === 'processed';
}

/**
 * Returns all tracking records for a tenant by scanning the tenant's
 * dedicated table.
 */
export async function getRecordsByTenant(
  tenantId: string,
): Promise<TrackingRecord[]> {
  const tableName = getTrackingTableName(tenantId);
  const response = await withRetry(
    () =>
      docClient.send(
        new ScanCommand({
          TableName: tableName,
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
  if (tenantId === 'unknown') {
    console.error(
      JSON.stringify({
        level: 'WARN',
        event: 'failure_not_tracked',
        messageId,
        reason: 'Tenant could not be resolved — no tenant-specific table available',
      }),
    );
    return;
  }

  const tableName = getTrackingTableName(tenantId);
  try {
    await withRetry(
      () =>
        docClient.send(
          new PutCommand({
            TableName: tableName,
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
