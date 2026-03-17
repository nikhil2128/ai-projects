import type { APIGatewayProxyEvent } from 'aws-lambda';
import { ddb, QueryCommand } from './dynamo.js';
import type { AuthContext, TenantRecord, UserRole } from '../types.js';

const TENANT_REGISTRY_TABLE = process.env.TENANT_REGISTRY_TABLE!;

export function extractAuthContext(event: APIGatewayProxyEvent): AuthContext {
  const ctx = event.requestContext.authorizer!;
  return {
    tenantId: ctx['tenantId'] as string,
    companyName: ctx['companyName'] as string,
    companySlug: ctx['companySlug'] as string,
    userId: ctx['userId'] as string,
    username: ctx['username'] as string,
    displayName: ctx['displayName'] as string,
    role: ctx['role'] as UserRole,
    userPoolId: ctx['userPoolId'] as string,
    userPoolClientId: ctx['userPoolClientId'] as string,
    modelsTable: ctx['modelsTable'] as string,
    entriesTable: ctx['entriesTable'] as string,
    versionsTable: ctx['versionsTable'] as string,
    settingsTable: ctx['settingsTable'] as string,
  };
}

export async function getTenantBySlug(slug: string): Promise<TenantRecord | undefined> {
  const result = await ddb.send(new QueryCommand({
    TableName: TENANT_REGISTRY_TABLE,
    IndexName: 'SlugIndex',
    KeyConditionExpression: 'slug = :slug',
    ExpressionAttributeValues: { ':slug': slug },
    Limit: 1,
  }));
  return result.Items?.[0] as TenantRecord | undefined;
}

export async function getTenantByUserPoolId(userPoolId: string): Promise<TenantRecord | undefined> {
  const result = await ddb.send(new QueryCommand({
    TableName: TENANT_REGISTRY_TABLE,
    IndexName: 'UserPoolIdIndex',
    KeyConditionExpression: 'userPoolId = :pid',
    ExpressionAttributeValues: { ':pid': userPoolId },
    Limit: 1,
  }));
  return result.Items?.[0] as TenantRecord | undefined;
}

export function requireRole(ctx: AuthContext, ...roles: UserRole[]): string | null {
  if (!roles.includes(ctx.role)) {
    return `Access denied. Required role: ${roles.join(' or ')}`;
  }
  return null;
}

export function parseBody<T = Record<string, unknown>>(body: string | null): T {
  if (!body) return {} as T;
  try {
    return JSON.parse(body) as T;
  } catch {
    return {} as T;
  }
}
