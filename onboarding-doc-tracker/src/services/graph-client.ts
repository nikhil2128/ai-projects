import { config } from '../config';
import { GraphTokenResponse } from '../types';

const TOKEN_URL = `https://login.microsoftonline.com/${config.azure.tenantId}/oauth2/v2.0/token`;
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

let cachedToken: { token: string; expiresAt: number } | null = null;

async function acquireToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const body = new URLSearchParams({
    client_id: config.azure.clientId,
    client_secret: config.azure.clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token acquisition failed (${response.status}): ${error}`);
  }

  const data = (await response.json()) as GraphTokenResponse;

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}

export async function graphFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await acquireToken();

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
    throw new Error(`Graph API error ${response.status} on ${path}: ${error}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/**
 * Upload binary content to Graph API (used for OneDrive file uploads).
 * Uses application/octet-stream content type instead of JSON.
 */
export async function graphUpload<T>(
  path: string,
  content: Buffer
): Promise<T> {
  const token = await acquireToken();

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
    throw new Error(
      `Graph upload error ${response.status} on ${path}: ${error}`
    );
  }

  return (await response.json()) as T;
}
