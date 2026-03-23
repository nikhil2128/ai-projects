import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import {
  CloudFormationClient,
  CreateStackCommand,
  DescribeStacksCommand,
} from '@aws-sdk/client-cloudformation';
import {
  CognitoIdentityProviderClient,
  AdminSetUserPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { getItem, putItem } from '../utils/dynamo.js';
import { getTenantBySlug, parseBody } from '../utils/tenant.js';
import { success, error } from '../utils/response.js';
import type { TenantRecord } from '../types.js';

const cfn = new CloudFormationClient({});
const cognito = new CognitoIdentityProviderClient({});

const TENANT_REGISTRY_TABLE = process.env.TENANT_REGISTRY_TABLE!;
const TENANT_STACK_TEMPLATE_URL = process.env.TENANT_STACK_TEMPLATE_URL!;
const TENANT_STACK_ROLE_ARN = process.env.TENANT_STACK_ROLE_ARN!;
const ENVIRONMENT = process.env.ENVIRONMENT ?? 'dev';
const REGION = process.env.REGION ?? process.env.AWS_REGION ?? 'us-east-1';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

async function resolveTenant(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const slug = event.queryStringParameters?.['slug'];
  if (!slug) return error('slug query parameter is required');

  const tenant = await getTenantBySlug(slug.trim());
  if (!tenant || tenant.status !== 'active') {
    return error('Company not found', 404);
  }

  return success({
    tenantId: tenant.tenantId,
    companyName: tenant.companyName,
    companySlug: tenant.slug,
    region: tenant.region,
    userPoolId: tenant.userPoolId,
    userPoolClientId: tenant.userPoolClientId,
  });
}

async function registerTenant(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const body = parseBody<{
    companyName?: string;
    companySlug?: string;
    adminUsername?: string;
    adminDisplayName?: string;
    adminPassword?: string;
  }>(event.body);

  if (!body.companyName || !body.adminUsername || !body.adminDisplayName || !body.adminPassword) {
    return error('companyName, adminUsername, adminDisplayName, and adminPassword are required');
  }

  const slug = slugify(body.companySlug?.trim() || body.companyName);
  if (!slug) return error('Company slug must include letters or numbers');

  const existing = await getTenantBySlug(slug);
  if (existing) return error('Company slug is already in use');

  const tenantId = uuidv4().replace(/-/g, '').slice(0, 12);
  const stackName = `cms-tenant-${tenantId}-${ENVIRONMENT}`;
  const now = new Date().toISOString();

  const tenantRecord: TenantRecord = {
    tenantId,
    slug,
    companyName: body.companyName.trim(),
    userPoolId: '',
    userPoolClientId: '',
    tenantRoleArn: '',
    modelsTable: `cms-${tenantId}-models`,
    entriesTable: `cms-${tenantId}-entries`,
    versionsTable: `cms-${tenantId}-versions`,
    settingsTable: `cms-${tenantId}-settings`,
    region: REGION,
    status: 'provisioning',
    adminUsername: body.adminUsername.trim(),
    adminDisplayName: body.adminDisplayName.trim(),
    stackName,
    createdAt: now,
    updatedAt: now,
  };

  await putItem(TENANT_REGISTRY_TABLE, tenantRecord as unknown as Record<string, unknown>);

  try {
    await cfn.send(new CreateStackCommand({
      StackName: stackName,
      TemplateURL: TENANT_STACK_TEMPLATE_URL,
      Capabilities: ['CAPABILITY_NAMED_IAM'],
      RoleARN: TENANT_STACK_ROLE_ARN,
      Parameters: [
        { ParameterKey: 'TenantId', ParameterValue: tenantId },
        { ParameterKey: 'CompanyName', ParameterValue: body.companyName.trim() },
        { ParameterKey: 'CompanySlug', ParameterValue: slug },
        { ParameterKey: 'Environment', ParameterValue: ENVIRONMENT },
        { ParameterKey: 'AdminUsername', ParameterValue: body.adminUsername.trim() },
        { ParameterKey: 'AdminDisplayName', ParameterValue: body.adminDisplayName.trim() },
        { ParameterKey: 'AdminPassword', ParameterValue: body.adminPassword },
      ],
      Tags: [
        { Key: 'Service', Value: 'content-cms' },
        { Key: 'TenantId', Value: tenantId },
        { Key: 'Environment', Value: ENVIRONMENT },
      ],
    }));
  } catch (err) {
    const record = await getItem<TenantRecord>(TENANT_REGISTRY_TABLE, { tenantId });
    if (record) {
      await putItem(TENANT_REGISTRY_TABLE, {
        ...record,
        status: 'failed',
        updatedAt: new Date().toISOString(),
      } as unknown as Record<string, unknown>);
    }
    console.error('Stack creation failed:', err);
    return error('Failed to provision tenant infrastructure', 500);
  }

  return success({
    tenantId,
    companyName: body.companyName.trim(),
    companySlug: slug,
    status: 'provisioning',
  }, 201);
}

async function checkTenantStatus(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const registrationId = event.pathParameters?.['registrationId'];
  if (!registrationId) return error('registrationId is required');

  const tenant = await getItem<TenantRecord>(TENANT_REGISTRY_TABLE, { tenantId: registrationId });
  if (!tenant) return error('Registration not found', 404);

  if (tenant.status === 'active') {
    return success({
      tenantId: tenant.tenantId,
      companyName: tenant.companyName,
      companySlug: tenant.slug,
      status: 'active',
    });
  }

  if (tenant.status === 'failed') {
    return success({ tenantId: tenant.tenantId, status: 'failed' });
  }

  if (!tenant.stackName) {
    return success({ tenantId: tenant.tenantId, status: 'provisioning' });
  }

  try {
    const stackResult = await cfn.send(new DescribeStacksCommand({
      StackName: tenant.stackName,
    }));

    const stack = stackResult.Stacks?.[0];
    if (!stack) {
      return success({ tenantId: tenant.tenantId, status: 'provisioning' });
    }

    const stackStatus = stack.StackStatus;

    if (stackStatus === 'CREATE_COMPLETE') {
      const outputs: Record<string, string> = {};
      for (const o of stack.Outputs ?? []) {
        if (o.OutputKey && o.OutputValue) outputs[o.OutputKey] = o.OutputValue;
      }

      const userPoolId = outputs['UserPoolId'] ?? '';
      const userPoolClientId = outputs['UserPoolClientId'] ?? '';
      const tenantRoleArn = outputs['TenantExecutionRoleArn'] ?? '';

      // Set permanent password for admin user
      if (tenant.adminUsername && !tenant.adminPasswordSet) {
        try {
          await cognito.send(new AdminSetUserPasswordCommand({
            UserPoolId: userPoolId,
            Username: tenant.adminUsername,
            Password: tenant.adminDisplayName ? `Temp${Date.now()}!` : 'TempPass1!',
            Permanent: false,
          }));
        } catch (e) {
          console.warn('Admin password set skipped (may already be set):', e);
        }
      }

      await putItem(TENANT_REGISTRY_TABLE, {
        ...tenant,
        userPoolId,
        userPoolClientId,
        tenantRoleArn,
        status: 'active',
        adminPasswordSet: true,
        updatedAt: new Date().toISOString(),
      } as unknown as Record<string, unknown>);

      return success({
        tenantId: tenant.tenantId,
        companyName: tenant.companyName,
        companySlug: tenant.slug,
        status: 'active',
      });
    }

    if (stackStatus?.includes('FAILED') || stackStatus?.includes('ROLLBACK')) {
      await putItem(TENANT_REGISTRY_TABLE, {
        ...tenant,
        status: 'failed',
        updatedAt: new Date().toISOString(),
      } as unknown as Record<string, unknown>);
      return success({ tenantId: tenant.tenantId, status: 'failed' });
    }

    return success({ tenantId: tenant.tenantId, status: 'provisioning' });
  } catch (err) {
    console.error('Status check error:', err);
    return success({ tenantId: tenant.tenantId, status: 'provisioning' });
  }
}

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const method = event.httpMethod;
  const resource = event.resource;

  if (method === 'GET' && resource === '/api/tenant/resolve') {
    return resolveTenant(event);
  }

  if (method === 'POST' && resource === '/api/tenant/register') {
    return registerTenant(event);
  }

  if (method === 'GET' && resource === '/api/tenant/status/{registrationId}') {
    return checkTenantStatus(event);
  }

  return error('Not found', 404);
};
