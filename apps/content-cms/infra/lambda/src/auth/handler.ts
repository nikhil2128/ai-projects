import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand,
  AdminGetUserCommand,
  AdminListGroupsForUserCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminAddUserToGroupCommand,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { extractAuthContext, getTenantBySlug, parseBody, requireRole } from '../utils/tenant.js';
import { success, error, forbidden } from '../utils/response.js';
import type { UserRole } from '../types.js';
import { VALID_ROLES } from '../types.js';

const cognito = new CognitoIdentityProviderClient({});

function resolveRole(groups: string[]): UserRole {
  if (groups.includes('approver')) return 'approver';
  if (groups.includes('reviewer')) return 'reviewer';
  return 'writer';
}

function attrMap(attrs: { Name?: string; Value?: string }[] | undefined): Record<string, string> {
  const map: Record<string, string> = {};
  for (const a of attrs ?? []) {
    if (a.Name && a.Value) map[a.Name] = a.Value;
  }
  return map;
}

// ── POST /api/auth/login (unauthenticated) ──────────────────

export const loginHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const body = parseBody<{ companySlug?: string; username?: string; password?: string }>(event.body);
  const { companySlug, username, password } = body;

  if (!companySlug || !username || !password) {
    return error('Company, username, and password are required');
  }

  const tenant = await getTenantBySlug(companySlug.trim());
  if (!tenant || tenant.status !== 'active') {
    return error('Invalid credentials', 401);
  }

  try {
    const authResult = await cognito.send(new AdminInitiateAuthCommand({
      UserPoolId: tenant.userPoolId,
      ClientId: tenant.userPoolClientId,
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: username.trim(),
        PASSWORD: password,
      },
    }));

    const idToken = authResult.AuthenticationResult?.IdToken;
    if (!idToken) return error('Authentication failed', 401);

    const userResult = await cognito.send(new AdminGetUserCommand({
      UserPoolId: tenant.userPoolId,
      Username: username.trim(),
    }));

    const groupsResult = await cognito.send(new AdminListGroupsForUserCommand({
      UserPoolId: tenant.userPoolId,
      Username: username.trim(),
    }));

    const attrs = attrMap(userResult.UserAttributes);
    const groups = groupsResult.Groups?.map(g => g.GroupName!).filter(Boolean) ?? [];
    const role = resolveRole(groups);

    return success({
      token: idToken,
      user: {
        id: attrs['sub'] ?? '',
        companyId: tenant.tenantId,
        companyName: tenant.companyName,
        companySlug: tenant.slug,
        username: username.trim(),
        displayName: attrs['custom:display_name'] ?? username.trim(),
        role,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Authentication failed';
    if (message.includes('NotAuthorizedException') || message.includes('UserNotFoundException')) {
      return error('Invalid credentials', 401);
    }
    console.error('Login error:', err);
    return error('Invalid credentials', 401);
  }
};

// ── Authenticated routes: GET /me, GET /users, POST /users ──

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const ctx = extractAuthContext(event);
  const method = event.httpMethod;
  const resource = event.resource;

  if (method === 'GET' && resource === '/api/auth/me') {
    return success({
      id: ctx.userId,
      companyId: ctx.tenantId,
      companyName: ctx.companyName,
      companySlug: ctx.companySlug,
      username: ctx.username,
      displayName: ctx.displayName,
      role: ctx.role,
    });
  }

  if (method === 'GET' && resource === '/api/auth/users') {
    const roleErr = requireRole(ctx, 'approver');
    if (roleErr) return forbidden(roleErr);

    const result = await cognito.send(new ListUsersCommand({
      UserPoolId: ctx.userPoolId,
    }));

    const users = await Promise.all((result.Users ?? []).map(async (u) => {
      const attrs = attrMap(u.Attributes);
      const groupsRes = await cognito.send(new AdminListGroupsForUserCommand({
        UserPoolId: ctx.userPoolId,
        Username: u.Username!,
      }));
      const groups = groupsRes.Groups?.map(g => g.GroupName!).filter(Boolean) ?? [];
      return {
        id: attrs['sub'] ?? '',
        companyId: ctx.tenantId,
        username: u.Username!,
        displayName: attrs['custom:display_name'] ?? u.Username!,
        role: resolveRole(groups),
        createdAt: u.UserCreateDate?.toISOString() ?? '',
      };
    }));

    return success(users);
  }

  if (method === 'POST' && resource === '/api/auth/users') {
    const roleErr = requireRole(ctx, 'approver');
    if (roleErr) return forbidden(roleErr);

    const body = parseBody<{
      username?: string;
      displayName?: string;
      password?: string;
      role?: string;
    }>(event.body);

    if (!body.username || !body.displayName || !body.password || !body.role) {
      return error('Username, display name, password, and role are required');
    }

    if (!VALID_ROLES.includes(body.role as UserRole)) {
      return error('Role must be writer, reviewer, or approver');
    }

    try {
      const createResult = await cognito.send(new AdminCreateUserCommand({
        UserPoolId: ctx.userPoolId,
        Username: body.username.trim(),
        TemporaryPassword: body.password,
        MessageAction: 'SUPPRESS',
        UserAttributes: [
          { Name: 'custom:display_name', Value: body.displayName.trim() },
          { Name: 'custom:tenant_id', Value: ctx.tenantId },
        ],
      }));

      await cognito.send(new AdminSetUserPasswordCommand({
        UserPoolId: ctx.userPoolId,
        Username: body.username.trim(),
        Password: body.password,
        Permanent: true,
      }));

      await cognito.send(new AdminAddUserToGroupCommand({
        UserPoolId: ctx.userPoolId,
        Username: body.username.trim(),
        GroupName: body.role,
      }));

      const attrs = attrMap(createResult.User?.Attributes);
      return success({
        id: attrs['sub'] ?? '',
        companyId: ctx.tenantId,
        username: body.username.trim(),
        displayName: body.displayName.trim(),
        role: body.role,
        createdAt: createResult.User?.UserCreateDate?.toISOString() ?? new Date().toISOString(),
      }, 201);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to create user';
      return error(message);
    }
  }

  return error('Not found', 404);
};
