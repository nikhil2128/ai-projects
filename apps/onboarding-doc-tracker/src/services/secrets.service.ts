import {
  SecretsManagerClient,
  CreateSecretCommand,
  GetSecretValueCommand,
  UpdateSecretCommand,
  DeleteSecretCommand,
} from '@aws-sdk/client-secrets-manager';
import { config } from '../config';
import { AzureCredentials, Tenant } from '../types';

const client = new SecretsManagerClient({ region: config.aws.region });

const secretCache = new Map<string, { value: string; expiresAt: number }>();

function secretName(tenantId: string): string {
  return `${config.aws.secretsPrefix}/${tenantId}/azure-client-secret`;
}

/**
 * Stores an Azure client secret in AWS Secrets Manager.
 * Returns the ARN of the created secret.
 */
export async function storeSecret(
  tenantId: string,
  clientSecret: string,
): Promise<string> {
  const name = secretName(tenantId);
  const result = await client.send(
    new CreateSecretCommand({
      Name: name,
      SecretString: clientSecret,
      Description: `Azure AD client secret for tenant ${tenantId}`,
      Tags: [
        { Key: 'TenantId', Value: tenantId },
        { Key: 'Project', Value: 'onboarding-doc-tracker' },
        { Key: 'ManagedBy', Value: 'application' },
      ],
    }),
  );

  secretCache.delete(name);
  return result.ARN!;
}

/**
 * Retrieves an Azure client secret from Secrets Manager with a short-lived
 * in-memory cache to avoid per-request round trips.
 */
export async function getSecret(secretArn: string): Promise<string> {
  const cached = secretCache.get(secretArn);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.value;
  }

  const result = await client.send(
    new GetSecretValueCommand({ SecretId: secretArn }),
  );

  const value = result.SecretString!;
  secretCache.set(secretArn, {
    value,
    expiresAt: Date.now() + config.security.secretsCacheTtlMs,
  });

  return value;
}

export async function updateSecret(
  secretArn: string,
  newValue: string,
): Promise<void> {
  await client.send(
    new UpdateSecretCommand({
      SecretId: secretArn,
      SecretString: newValue,
    }),
  );

  secretCache.delete(secretArn);
}

export async function deleteSecret(secretArn: string): Promise<void> {
  await client.send(
    new DeleteSecretCommand({
      SecretId: secretArn,
      ForceDeleteWithoutRecovery: false,
      RecoveryWindowInDays: 7,
    }),
  );

  secretCache.delete(secretArn);
}

/**
 * Resolves the full Azure credentials for a tenant by fetching the client
 * secret from Secrets Manager.
 */
export async function resolveAzureCredentials(
  tenant: Tenant,
): Promise<AzureCredentials> {
  const clientSecret = await getSecret(tenant.azureClientSecretArn);
  return {
    tenantId: tenant.azureTenantId,
    clientId: tenant.azureClientId,
    clientSecret,
  };
}

export function clearSecretCache(): void {
  secretCache.clear();
}
