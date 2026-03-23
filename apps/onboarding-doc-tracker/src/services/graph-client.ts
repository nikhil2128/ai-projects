import { config } from '../config';
import { AzureCredentials, GraphTokenResponse } from '../types';
import { withRetry, RetryableError } from '../utils/resilience';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

const retryOpts = {
  maxAttempts: config.processing.retryMaxAttempts,
  baseDelayMs: config.processing.retryBaseDelayMs,
  maxDelayMs: config.processing.retryMaxDelayMs,
  isRetryable: (error: unknown) => error instanceof RetryableError,
};

async function acquireToken(credentials: AzureCredentials): Promise<string> {
  const cacheKey = `${credentials.tenantId}:${credentials.clientId}`;
  const cached = tokenCache.get(cacheKey);

  if (cached && Date.now() < cached.expiresAt - 60_000) {
    return cached.token;
  }

  const tokenUrl = `https://login.microsoftonline.com/${credentials.tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  return withRetry(async () => {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      if (RETRYABLE_STATUS_CODES.has(response.status)) {
        throw new RetryableError(
          `Token acquisition failed (${response.status}): ${error}`,
          response.status,
          parseRetryAfter(response)
        );
      }
      throw new Error(`Token acquisition failed (${response.status}): ${error}`);
    }

    const data = (await response.json()) as GraphTokenResponse;

    tokenCache.set(cacheKey, {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    });

    return data.access_token;
  }, retryOpts);
}

export async function graphFetch<T>(
  path: string,
  options: RequestInit = {},
  credentials: AzureCredentials
): Promise<T> {
  return withRetry(async () => {
    const token = await acquireToken(credentials);

    const response = await fetch(`${GRAPH_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();

      if (response.status === 401) {
        const cacheKey = `${credentials.tenantId}:${credentials.clientId}`;
        tokenCache.delete(cacheKey);
      }

      if (RETRYABLE_STATUS_CODES.has(response.status)) {
        throw new RetryableError(
          `Graph API error ${response.status} on ${path}: ${error}`,
          response.status,
          parseRetryAfter(response)
        );
      }
      throw new Error(`Graph API error ${response.status} on ${path}: ${error}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }, retryOpts);
}

/**
 * Upload binary content to Graph API (used for OneDrive file uploads).
 * Uses application/octet-stream content type instead of JSON.
 */
export async function graphUpload<T>(
  path: string,
  content: Buffer,
  credentials: AzureCredentials
): Promise<T> {
  return withRetry(async () => {
    const token = await acquireToken(credentials);

    const response = await fetch(`${GRAPH_BASE}${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
      },
      body: content,
    });

    if (!response.ok) {
      const error = await response.text();

      if (response.status === 401) {
        const cacheKey = `${credentials.tenantId}:${credentials.clientId}`;
        tokenCache.delete(cacheKey);
      }

      if (RETRYABLE_STATUS_CODES.has(response.status)) {
        throw new RetryableError(
          `Graph upload error ${response.status} on ${path}: ${error}`,
          response.status,
          parseRetryAfter(response)
        );
      }
      throw new Error(
        `Graph upload error ${response.status} on ${path}: ${error}`
      );
    }

    return (await response.json()) as T;
  }, retryOpts);
}

/** Exposed for testing — clears the per-tenant token cache. */
export function clearTokenCache(): void {
  tokenCache.clear();
}

function parseRetryAfter(response: Response): number | undefined {
  const header = response.headers.get('Retry-After');
  if (!header) return undefined;

  const seconds = parseInt(header, 10);
  if (!isNaN(seconds)) return seconds * 1000;

  const date = Date.parse(header);
  if (!isNaN(date)) return Math.max(0, date - Date.now());

  return undefined;
}
