import { timingSafeEqual } from 'crypto';

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch]);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(value: string): boolean {
  return UUID_RE.test(value);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value) && value.length <= 254;
}

/**
 * Constant-time string comparison to prevent timing attacks on secrets
 * such as API keys. Falls back to `false` if lengths differ (the length
 * difference is already observable, but the content is not leaked).
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // still perform a comparison to keep timing semi-consistent
    timingSafeEqual(Buffer.from(a), Buffer.from(a));
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function assertMaxLength(
  value: string,
  maxLen: number,
  fieldName: string,
): void {
  if (value.length > maxLen) {
    throw new ValidationError(`${fieldName} exceeds maximum length of ${maxLen}`);
  }
}

export function sanitizeString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') return undefined;
  return value.trim();
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validates and sanitizes a tenant input payload. Throws `ValidationError`
 * if any field fails validation.
 */
export function validateTenantInput(body: Record<string, unknown>): void {
  const stringFields: Array<{ key: string; maxLen: number }> = [
    { key: 'companyName', maxLen: 200 },
    { key: 'receivingEmail', maxLen: 254 },
    { key: 'hrEmail', maxLen: 254 },
    { key: 'hrUserId', maxLen: 200 },
    { key: 'azureTenantId', maxLen: 100 },
    { key: 'azureClientId', maxLen: 100 },
    { key: 'azureClientSecret', maxLen: 500 },
    { key: 'oneDriveRootFolder', maxLen: 500 },
    { key: 'sesFromEmail', maxLen: 254 },
  ];

  for (const { key, maxLen } of stringFields) {
    const val = body[key];
    if (val === undefined) continue;
    if (typeof val !== 'string') {
      throw new ValidationError(`${key} must be a string`);
    }
    assertMaxLength(val, maxLen, key);
  }

  const emailFields = ['receivingEmail', 'hrEmail', 'sesFromEmail'] as const;
  for (const key of emailFields) {
    const val = body[key];
    if (typeof val === 'string' && !isValidEmail(val)) {
      throw new ValidationError(`${key} is not a valid email address`);
    }
  }
}

/**
 * Strips any fields from an object that are not in the allowed set, preventing
 * mass-assignment / prototype pollution.
 */
export function pickAllowedFields<T extends Record<string, unknown>>(
  body: T,
  allowed: string[],
): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      result[key] = body[key];
    }
  }
  return result as Partial<T>;
}
