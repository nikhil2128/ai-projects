import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { getConfig } from '../config';
import {
  ExportJob,
  ExportStatus,
  PaginationStrategy,
  CreateExportInput,
  ExportStatusResponse,
} from '../types';

let docClient: DynamoDBDocumentClient | null = null;

function getDocClient(): DynamoDBDocumentClient {
  if (!docClient) {
    const cfg = getConfig();
    const client = new DynamoDBClient({
      region: cfg.dynamodb.region,
      ...(cfg.dynamodb.endpoint && { endpoint: cfg.dynamodb.endpoint }),
    });
    docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return docClient;
}

export function resetClient(): void {
  docClient = null;
}

export async function createExportJob(
  dto: CreateExportInput,
  defaultPageSize: number,
): Promise<ExportJob> {
  const now = new Date().toISOString();
  const job: ExportJob = {
    id: uuidv4(),
    status: ExportStatus.PENDING,
    apiUrl: dto.apiUrl,
    email: dto.email,
    paginationStrategy: dto.paginationStrategy ?? PaginationStrategy.PAGE,
    headers: dto.headers ?? null,
    queryParams: dto.queryParams ?? null,
    pageSize: dto.pageSize ?? defaultPageSize,
    dataPath: dto.dataPath ?? 'data',
    cursorPath: dto.cursorPath ?? null,
    cursorParam: dto.cursorParam ?? null,
    fileName: dto.fileName ?? null,
    s3Key: null,
    downloadUrl: null,
    totalRecords: 0,
    pagesProcessed: 0,
    errorMessage: null,
    attempts: 0,
    startedAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const cfg = getConfig();
  await getDocClient().send(
    new PutCommand({
      TableName: cfg.dynamodb.tableName,
      Item: job,
    }),
  );

  return job;
}

export async function getExportJob(
  id: string,
): Promise<ExportJob | null> {
  const cfg = getConfig();
  const result = await getDocClient().send(
    new GetCommand({
      TableName: cfg.dynamodb.tableName,
      Key: { id },
    }),
  );

  return (result.Item as ExportJob) ?? null;
}

export async function updateExportJob(
  id: string,
  updates: Partial<Omit<ExportJob, 'id' | 'createdAt'>>,
): Promise<void> {
  const cfg = getConfig();
  const updateFields = { ...updates, updatedAt: new Date().toISOString() };

  const expressionParts: string[] = [];
  const expressionValues: Record<string, unknown> = {};
  const expressionNames: Record<string, string> = {};

  let index = 0;
  for (const [key, value] of Object.entries(updateFields)) {
    const valueKey = `:v${index}`;
    const nameKey = `#n${index}`;
    expressionParts.push(`${nameKey} = ${valueKey}`);
    expressionValues[valueKey] = value;
    expressionNames[nameKey] = key;
    index++;
  }

  await getDocClient().send(
    new UpdateCommand({
      TableName: cfg.dynamodb.tableName,
      Key: { id },
      UpdateExpression: `SET ${expressionParts.join(', ')}`,
      ExpressionAttributeValues: expressionValues,
      ExpressionAttributeNames: expressionNames,
    }),
  );
}

export function toStatusResponse(job: ExportJob): ExportStatusResponse {
  return {
    id: job.id,
    status: job.status,
    totalRecords: job.totalRecords,
    pagesProcessed: job.pagesProcessed,
    downloadUrl: job.downloadUrl,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  };
}
