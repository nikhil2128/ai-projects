import { validateCreateExport, isValidUuid } from './validator';

describe('isValidUuid', () => {
  it('should accept valid UUIDs', () => {
    expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidUuid('00000000-0000-0000-0000-000000000000')).toBe(true);
  });

  it('should reject invalid UUIDs', () => {
    expect(isValidUuid('not-a-uuid')).toBe(false);
    expect(isValidUuid('')).toBe(false);
    expect(isValidUuid('550e8400e29b41d4a716446655440000')).toBe(false);
  });
});

describe('validateCreateExport', () => {
  const validDto = {
    apiUrl: 'https://api.example.com/data',
    email: 'user@example.com',
  };

  it('should accept a valid minimal request', () => {
    const result = validateCreateExport(validDto);
    expect(result.errors).toHaveLength(0);
    expect(result.dto).toEqual(validDto);
  });

  it('should accept a valid request with all optional fields', () => {
    const dto = {
      apiUrl: 'https://api.example.com/orders',
      email: 'admin@example.com',
      paginationStrategy: 'cursor',
      headers: { Authorization: 'Bearer token123' },
      queryParams: { status: 'active' },
      pageSize: 100,
      dataPath: 'results.items',
      cursorPath: 'meta.next',
      cursorParam: 'after',
      fileName: 'orders-report',
    };

    const result = validateCreateExport(dto);
    expect(result.errors).toHaveLength(0);
    expect(result.dto).toBeDefined();
    expect(result.dto!.paginationStrategy).toBe('cursor');
    expect(result.dto!.pageSize).toBe(100);
  });

  it('should reject missing required fields', () => {
    const result = validateCreateExport({});
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors).toContainEqual(
      expect.stringContaining('apiUrl'),
    );
    expect(result.errors).toContainEqual(
      expect.stringContaining('email'),
    );
  });

  it('should reject invalid email', () => {
    const result = validateCreateExport({
      apiUrl: 'https://api.example.com/data',
      email: 'not-an-email',
    });
    expect(result.errors).toContainEqual(
      expect.stringContaining('email must be an email'),
    );
  });

  it('should reject invalid URL', () => {
    const result = validateCreateExport({
      apiUrl: '://missing-protocol',
      email: 'user@example.com',
    });
    expect(result.errors).toContainEqual(
      expect.stringContaining('apiUrl must be a URL address'),
    );
  });

  it('should reject pageSize out of range', () => {
    const result = validateCreateExport({
      ...validDto,
      pageSize: 10000,
    });
    expect(result.errors).toContainEqual(
      expect.stringContaining('pageSize must not be greater than 5000'),
    );
  });

  it('should reject pageSize less than 1', () => {
    const result = validateCreateExport({
      ...validDto,
      pageSize: 0,
    });
    expect(result.errors).toContainEqual(
      expect.stringContaining('pageSize must not be less than 1'),
    );
  });

  it('should reject invalid pagination strategy', () => {
    const result = validateCreateExport({
      ...validDto,
      paginationStrategy: 'invalid',
    });
    expect(result.errors).toContainEqual(
      expect.stringContaining('paginationStrategy must be one of'),
    );
  });

  it('should reject non-whitelisted fields', () => {
    const result = validateCreateExport({
      ...validDto,
      unknownField: 'should be rejected',
    });
    expect(result.errors).toContainEqual(
      expect.stringContaining('property unknownField should not exist'),
    );
  });

  it('should reject non-object body', () => {
    expect(validateCreateExport(null).errors.length).toBeGreaterThan(0);
    expect(validateCreateExport('string').errors.length).toBeGreaterThan(0);
    expect(validateCreateExport([]).errors.length).toBeGreaterThan(0);
  });

  it('should reject non-object headers', () => {
    const result = validateCreateExport({
      ...validDto,
      headers: 'string',
    });
    expect(result.errors).toContainEqual(
      expect.stringContaining('headers must be an object'),
    );
  });

  it('should reject non-object queryParams', () => {
    const result = validateCreateExport({
      ...validDto,
      queryParams: 123,
    });
    expect(result.errors).toContainEqual(
      expect.stringContaining('queryParams must be an object'),
    );
  });

  it('should reject non-string dataPath', () => {
    const result = validateCreateExport({
      ...validDto,
      dataPath: 123,
    });
    expect(result.errors).toContainEqual(
      expect.stringContaining('dataPath must be a string'),
    );
  });
});
