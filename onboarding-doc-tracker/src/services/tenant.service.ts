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
import { CreateTenantInput, UpdateTenantInput, Tenant } from '../types';
import { storeSecret, updateSecret, deleteSecret } from './secrets.service';
import { auditLog } from '../middleware/security';

const ddbClient = new DynamoDBClient({ region: config.aws.region });
const docClient = DynamoDBDocumentClient.from(ddbClient);

const TABLE = config.aws.tenantsTable;

export async function createTenant(input: CreateTenantInput): Promise<Tenant> {
  const existing = await getTenantByReceivingEmail(input.receivingEmail);
  if (existing) {
    throw new Error(`A tenant with receiving email "${input.receivingEmail}" already exists`);
  }

  const tenantId = randomUUID();
  const now = new Date().toISOString();

  const secretArn = await storeSecret(tenantId, input.azureClientSecret);

  const { azureClientSecret: _, ...safeInput } = input;

  const tenant: Tenant = {
    ...safeInput,
    tenantId,
    azureClientSecretArn: secretArn,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: tenant,
      ConditionExpression: 'attribute_not_exists(tenantId)',
    }),
  );

  auditLog('tenant.created', { tenantId, companyName: input.companyName });

  return tenant;
}

export async function getTenant(tenantId: string): Promise<Tenant | null> {
  const response = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { tenantId },
    }),
  );
  return (response.Item as Tenant) || null;
}

export async function getTenantByReceivingEmail(
  receivingEmail: string,
): Promise<Tenant | null> {
  const response = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'receivingEmail-index',
      KeyConditionExpression: 'receivingEmail = :email',
      ExpressionAttributeValues: { ':email': receivingEmail },
      Limit: 1,
    }),
  );

  const items = response.Items || [];
  return (items[0] as Tenant) || null;
}

export async function updateTenant(
  tenantId: string,
  updates: UpdateTenantInput,
): Promise<Tenant | null> {
  const existing = await getTenant(tenantId);
  if (!existing) return null;

  if (updates.receivingEmail && updates.receivingEmail !== existing.receivingEmail) {
    const conflict = await getTenantByReceivingEmail(updates.receivingEmail);
    if (conflict) {
      throw new Error(`A tenant with receiving email "${updates.receivingEmail}" already exists`);
    }
  }

  if (updates.azureClientSecret) {
    await updateSecret(existing.azureClientSecretArn, updates.azureClientSecret);
    auditLog('tenant.secret_rotated', { tenantId });
  }

  const { azureClientSecret: _, ...safeUpdates } = updates;

  const updated: Tenant = {
    ...existing,
    ...safeUpdates,
    tenantId,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: updated,
    }),
  );

  auditLog('tenant.updated', { tenantId, fields: Object.keys(safeUpdates) });

  return updated;
}

export async function deleteTenant(tenantId: string): Promise<boolean> {
  const existing = await getTenant(tenantId);
  if (!existing) return false;

  await deleteSecret(existing.azureClientSecretArn);

  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { tenantId },
    }),
  );

  auditLog('tenant.deleted', { tenantId, companyName: existing.companyName });

  return true;
}

export async function listTenants(): Promise<Tenant[]> {
  const response = await docClient.send(
    new ScanCommand({ TableName: TABLE }),
  );
  return (response.Items as Tenant[]) || [];
}
