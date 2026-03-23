import { PaginationStrategy, CreateExportInput } from '../types';

const ALLOWED_FIELDS = new Set([
  'apiUrl',
  'email',
  'paginationStrategy',
  'headers',
  'queryParams',
  'pageSize',
  'dataPath',
  'cursorPath',
  'cursorParam',
  'fileName',
]);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

export function validateCreateExport(body: unknown): {
  errors: string[];
  dto?: CreateExportInput;
} {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { errors: ['Request body must be a JSON object'] };
  }

  const obj = body as Record<string, unknown>;
  const errors: string[] = [];

  const unknownFields = Object.keys(obj).filter(
    (key) => !ALLOWED_FIELDS.has(key),
  );
  if (unknownFields.length > 0) {
    errors.push(
      ...unknownFields.map(
        (field) => `property ${field} should not exist`,
      ),
    );
  }

  if (obj.apiUrl === undefined || obj.apiUrl === null) {
    errors.push('apiUrl should not be empty');
  } else if (typeof obj.apiUrl !== 'string' || !isValidUrl(obj.apiUrl)) {
    errors.push('apiUrl must be a URL address');
  }

  if (obj.email === undefined || obj.email === null) {
    errors.push('email should not be empty');
  } else if (typeof obj.email !== 'string' || !EMAIL_REGEX.test(obj.email)) {
    errors.push('email must be an email');
  }

  if (obj.paginationStrategy !== undefined) {
    if (
      !Object.values(PaginationStrategy).includes(
        obj.paginationStrategy as PaginationStrategy,
      )
    ) {
      errors.push(
        'paginationStrategy must be one of the following values: page, offset, cursor',
      );
    }
  }

  if (obj.headers !== undefined && !isPlainObject(obj.headers)) {
    errors.push('headers must be an object');
  }

  if (obj.queryParams !== undefined && !isPlainObject(obj.queryParams)) {
    errors.push('queryParams must be an object');
  }

  if (obj.pageSize !== undefined) {
    const pageSize = Number(obj.pageSize);
    if (!Number.isInteger(pageSize)) {
      errors.push('pageSize must be an integer number');
    } else if (pageSize < 1) {
      errors.push('pageSize must not be less than 1');
    } else if (pageSize > 5000) {
      errors.push('pageSize must not be greater than 5000');
    }
  }

  if (obj.dataPath !== undefined && typeof obj.dataPath !== 'string') {
    errors.push('dataPath must be a string');
  }

  if (obj.cursorPath !== undefined && typeof obj.cursorPath !== 'string') {
    errors.push('cursorPath must be a string');
  }

  if (obj.cursorParam !== undefined && typeof obj.cursorParam !== 'string') {
    errors.push('cursorParam must be a string');
  }

  if (obj.fileName !== undefined && typeof obj.fileName !== 'string') {
    errors.push('fileName must be a string');
  }

  if (errors.length > 0) {
    return { errors };
  }

  const dto: CreateExportInput = {
    apiUrl: obj.apiUrl as string,
    email: obj.email as string,
  };

  if (obj.paginationStrategy !== undefined) {
    dto.paginationStrategy = obj.paginationStrategy as PaginationStrategy;
  }
  if (obj.headers !== undefined) {
    dto.headers = obj.headers as Record<string, string>;
  }
  if (obj.queryParams !== undefined) {
    dto.queryParams = obj.queryParams as Record<string, string>;
  }
  if (obj.pageSize !== undefined) {
    dto.pageSize = Number(obj.pageSize);
  }
  if (obj.dataPath !== undefined) {
    dto.dataPath = obj.dataPath as string;
  }
  if (obj.cursorPath !== undefined) {
    dto.cursorPath = obj.cursorPath as string;
  }
  if (obj.cursorParam !== undefined) {
    dto.cursorParam = obj.cursorParam as string;
  }
  if (obj.fileName !== undefined) {
    dto.fileName = obj.fileName as string;
  }

  return { errors: [], dto };
}
