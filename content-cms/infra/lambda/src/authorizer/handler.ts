import type {
  APIGatewayTokenAuthorizerEvent,
  APIGatewayAuthorizerResult,
} from 'aws-lambda';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { getTenantByUserPoolId } from '../utils/tenant.js';
import type { TenantRecord } from '../types.js';

type JwtVerifier = ReturnType<typeof CognitoJwtVerifier.create>;
const verifierCache = new Map<string, JwtVerifier>();

function decodeTokenPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');
  return JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8'));
}

function buildPolicy(
  principalId: string,
  effect: 'Allow' | 'Deny',
  methodArn: string,
  context: Record<string, string>,
): APIGatewayAuthorizerResult {
  const arnParts = methodArn.split(':');
  const region = arnParts[3]!;
  const accountId = arnParts[4]!;
  const apiGatewayArnParts = arnParts[5]!.split('/');
  const apiId = apiGatewayArnParts[0]!;
  const stage = apiGatewayArnParts[1]!;
  const resourceArn = `arn:aws:execute-api:${region}:${accountId}:${apiId}/${stage}/*`;

  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: resourceArn,
      }],
    },
    context,
  };
}

function resolveRole(groups: string[]): string {
  if (groups.includes('approver')) return 'approver';
  if (groups.includes('reviewer')) return 'reviewer';
  return 'writer';
}

export const handler = async (
  event: APIGatewayTokenAuthorizerEvent,
): Promise<APIGatewayAuthorizerResult> => {
  const token = event.authorizationToken?.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Unauthorized');

  try {
    const payload = decodeTokenPayload(token);
    const issuer = payload['iss'] as string | undefined;
    if (!issuer) throw new Error('No issuer in token');

    const poolId = issuer.split('/').pop()!;
    const tenant = await getTenantByUserPoolId(poolId);
    if (!tenant || tenant.status !== 'active') throw new Error('Unknown tenant');

    let verifier = verifierCache.get(poolId);
    if (!verifier) {
      verifier = CognitoJwtVerifier.create({
        userPoolId: poolId,
        tokenUse: 'id',
        clientId: tenant.userPoolClientId,
      });
      verifierCache.set(poolId, verifier);
    }

    const verified = await verifier.verify(token);
    const groups = (verified['cognito:groups'] as string[] | undefined) ?? [];
    const role = resolveRole(groups);
    const username = (verified['cognito:username'] as string) ?? verified.sub!;
    const displayName = (verified['custom:display_name'] as string) ?? username;

    return buildPolicy(verified.sub!, 'Allow', event.methodArn, {
      tenantId: tenant.tenantId,
      companyName: tenant.companyName,
      companySlug: tenant.slug,
      userId: verified.sub!,
      username,
      displayName,
      role,
      userPoolId: tenant.userPoolId,
      userPoolClientId: tenant.userPoolClientId,
      modelsTable: tenant.modelsTable,
      entriesTable: tenant.entriesTable,
      versionsTable: tenant.versionsTable,
      settingsTable: tenant.settingsTable,
    });
  } catch (err) {
    console.error('Authorization failed:', err);
    throw new Error('Unauthorized');
  }
};
