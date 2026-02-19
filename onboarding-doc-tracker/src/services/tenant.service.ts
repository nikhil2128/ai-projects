import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { config } from '../config';
import { Tenant } from '../types';

const ddbClient = new DynamoDBClient({ region: config.aws.region });
const docClient = DynamoDBDocumentClient.from(ddbClient);

const TABLE = config.aws.tenantsTable;

export type CreateTenantInput = Omit<Tenant, 'tenantId' | 'status' | 'createdAt' | 'updatedAt'>;

export async function createTenant(input: CreateTenantInput): Promise<Tenant> {
  const existing = await getTenantByReceivingEmail(input.receivingEmail);
  if (existing) {
    throw new Error(`A tenant with receiving email "${input.receivingEmail}" already exists`);
  }

  const now = new Date().toISOString();
  const tenant: Tenant = {
    ...input,
    tenantId: randomUUID(),
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: tenant,
      ConditionExpression: 'attribute_not_exists(tenantId)',
    })
  );

  return tenant;
}

export async function getTenant(tenantId: string): Promise<Tenant | null> {
  const response = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { tenantId },
    })
  );
  return (response.Item as Tenant) || null;
}

export async function getTenantByReceivingEmail(
  receivingEmail: string
): Promise<Tenant | null> {
  const response = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'receivingEmail-index',
      KeyConditionExpression: 'receivingEmail = :email',
      ExpressionAttributeValues: { ':email': receivingEmail },
      Limit: 1,
    })
  );

  const items = response.Items || [];
  return (items[0] as Tenant) || null;
}

export async function updateTenant(
  tenantId: string,
  updates: Partial<CreateTenantInput>
): Promise<Tenant | null> {
  const existing = await getTenant(tenantId);
  if (!existing) return null;

  if (updates.receivingEmail && updates.receivingEmail !== existing.receivingEmail) {
    const conflict = await getTenantByReceivingEmail(updates.receivingEmail);
    if (conflict) {
      throw new Error(`A tenant with receiving email "${updates.receivingEmail}" already exists`);
    }
  }

  const updated: Tenant = {
    ...existing,
    ...updates,
    tenantId,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: updated,
    })
  );

  return updated;
}

export async function deleteTenant(tenantId: string): Promise<boolean> {
  const existing = await getTenant(tenantId);
  if (!existing) return false;

  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { tenantId },
    })
  );

  return true;
}

export async function listTenants(): Promise<Tenant[]> {
  const response = await docClient.send(
    new ScanCommand({ TableName: TABLE })
  );
  return (response.Items as Tenant[]) || [];
}
