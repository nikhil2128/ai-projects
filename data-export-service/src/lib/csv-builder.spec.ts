import {
  buildPageUrl,
  extractByPath,
  flattenRecord,
  extractColumns,
  fetchPage,
  fetchRawResponse,
} from './csv-builder';
import { ExportJob, ExportStatus, PaginationStrategy } from '../types';

const createMockExportJob = (
  overrides: Partial<ExportJob> = {},
): ExportJob => ({
  id: 'job-1',
  status: ExportStatus.PENDING,
  apiUrl: 'https://api.example.com/data',
  email: 'user@example.com',
  paginationStrategy: PaginationStrategy.PAGE,
  headers: null,
  queryParams: null,
  pageSize: 10,
  dataPath: 'data',
  cursorPath: null,
  cursorParam: null,
  fileName: null,
  s3Key: null,
  downloadUrl: null,
  totalRecords: 0,
  pagesProcessed: 0,
  errorMessage: null,
  attempts: 0,
  startedAt: null,
  completedAt: null,
  createdAt: '2026-01-15T10:00:00.000Z',
  updatedAt: '2026-01-15T10:00:00.000Z',
  ...overrides,
});

describe('buildPageUrl', () => {
  it('should build URL with PAGE strategy', () => {
    const job = createMockExportJob({
      apiUrl: 'https://api.example.com/users',
      pageSize: 50,
    });

    const url = buildPageUrl(job, 0, null);
    const parsed = new URL(url);

    expect(parsed.searchParams.get('page')).toBe('1');
    expect(parsed.searchParams.get('limit')).toBe('50');
  });

  it('should build URL with PAGE strategy for page 5', () => {
    const job = createMockExportJob({
      apiUrl: 'https://api.example.com/users',
      pageSize: 100,
    });

    const url = buildPageUrl(job, 4, null);
    const parsed = new URL(url);

    expect(parsed.searchParams.get('page')).toBe('5');
    expect(parsed.searchParams.get('limit')).toBe('100');
  });

  it('should build URL with OFFSET strategy', () => {
    const job = createMockExportJob({
      apiUrl: 'https://api.example.com/items',
      paginationStrategy: PaginationStrategy.OFFSET,
      pageSize: 25,
    });

    const url = buildPageUrl(job, 3, null);
    const parsed = new URL(url);

    expect(parsed.searchParams.get('offset')).toBe('75');
    expect(parsed.searchParams.get('limit')).toBe('25');
  });

  it('should build URL with CURSOR strategy without cursor', () => {
    const job = createMockExportJob({
      apiUrl: 'https://api.example.com/events',
      paginationStrategy: PaginationStrategy.CURSOR,
      pageSize: 100,
    });

    const url = buildPageUrl(job, 0, null);
    const parsed = new URL(url);

    expect(parsed.searchParams.get('limit')).toBe('100');
    expect(parsed.searchParams.has('cursor')).toBe(false);
  });

  it('should build URL with CURSOR strategy with cursor value', () => {
    const job = createMockExportJob({
      apiUrl: 'https://api.example.com/events',
      paginationStrategy: PaginationStrategy.CURSOR,
      cursorParam: 'after',
      pageSize: 100,
    });

    const url = buildPageUrl(job, 1, 'abc123');
    const parsed = new URL(url);

    expect(parsed.searchParams.get('limit')).toBe('100');
    expect(parsed.searchParams.get('after')).toBe('abc123');
  });

  it('should use default cursor param name when cursorParam is null', () => {
    const job = createMockExportJob({
      apiUrl: 'https://api.example.com/events',
      paginationStrategy: PaginationStrategy.CURSOR,
      cursorParam: null,
      pageSize: 50,
    });

    const url = buildPageUrl(job, 1, 'xyz');
    const parsed = new URL(url);

    expect(parsed.searchParams.get('cursor')).toBe('xyz');
  });

  it('should include queryParams in the URL', () => {
    const job = createMockExportJob({
      apiUrl: 'https://api.example.com/users',
      queryParams: { status: 'active', sort: 'name' },
      pageSize: 10,
    });

    const url = buildPageUrl(job, 0, null);
    const parsed = new URL(url);

    expect(parsed.searchParams.get('status')).toBe('active');
    expect(parsed.searchParams.get('sort')).toBe('name');
    expect(parsed.searchParams.get('page')).toBe('1');
  });
});

describe('extractByPath', () => {
  it('should extract a top-level value', () => {
    expect(extractByPath({ data: [1, 2, 3] }, 'data')).toEqual([1, 2, 3]);
  });

  it('should extract a nested value', () => {
    const obj = { response: { results: { items: [{ id: 1 }] } } };
    expect(extractByPath(obj, 'response.results.items')).toEqual([
      { id: 1 },
    ]);
  });

  it('should return undefined for non-existent path', () => {
    expect(extractByPath({ data: [] }, 'missing.path')).toBeUndefined();
  });

  it('should return undefined when intermediate value is null', () => {
    expect(extractByPath({ data: null }, 'data.items')).toBeUndefined();
  });

  it('should return undefined when object is null', () => {
    expect(extractByPath(null, 'data')).toBeUndefined();
  });

  it('should return undefined when object is a primitive', () => {
    expect(extractByPath(42, 'data')).toBeUndefined();
  });
});

describe('flattenRecord', () => {
  it('should return flat record with stringified values', () => {
    const record = { id: 1, name: 'Alice', active: true };
    const result = flattenRecord(record);

    expect(result).toEqual({ id: '1', name: 'Alice', active: 'true' });
  });

  it('should flatten nested objects with dot notation', () => {
    const record = {
      user: { name: 'Alice', address: { city: 'NYC' } },
    };
    const result = flattenRecord(record);

    expect(result).toEqual({
      'user.name': 'Alice',
      'user.address.city': 'NYC',
    });
  });

  it('should stringify arrays', () => {
    const record = { tags: ['a', 'b', 'c'] };
    const result = flattenRecord(record);

    expect(result).toEqual({ tags: '["a","b","c"]' });
  });

  it('should convert null to empty string', () => {
    const record = { value: null };
    const result = flattenRecord(record);

    expect(result).toEqual({ value: '' });
  });

  it('should convert undefined to empty string', () => {
    const record = { value: undefined };
    const result = flattenRecord(record);

    expect(result).toEqual({ value: '' });
  });

  it('should handle prefix parameter', () => {
    const record = { name: 'Alice' };
    const result = flattenRecord(record, 'user');

    expect(result).toEqual({ 'user.name': 'Alice' });
  });

  it('should handle mixed nested structures', () => {
    const record = {
      id: 42,
      meta: { created: '2026-01-01' },
      tags: [1, 2],
      note: null,
    };
    const result = flattenRecord(record);

    expect(result).toEqual({
      id: '42',
      'meta.created': '2026-01-01',
      tags: '[1,2]',
      note: '',
    });
  });
});

describe('extractColumns', () => {
  it('should extract column names from a flat record', () => {
    const record = { id: 1, name: 'Alice', email: 'alice@example.com' };
    expect(extractColumns(record)).toEqual(['id', 'name', 'email']);
  });

  it('should extract flattened column names from nested record', () => {
    const record = {
      id: 1,
      user: { name: 'Alice', profile: { bio: 'Hi' } },
    };
    expect(extractColumns(record)).toEqual([
      'id',
      'user.name',
      'user.profile.bio',
    ]);
  });
});

describe('fetchPage', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should return parsed data array', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 1 }, { id: 2 }] }),
    });

    const result = await fetchPage(
      'https://api.example.com/data',
      null,
      'data',
    );
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('should return empty array when data path yields non-array', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'not an array' }),
    });

    const result = await fetchPage(
      'https://api.example.com/data',
      null,
      'data',
    );
    expect(result).toEqual([]);
  });

  it('should return empty array when data path is missing', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ other: [] }),
    });

    const result = await fetchPage(
      'https://api.example.com/data',
      null,
      'data',
    );
    expect(result).toEqual([]);
  });

  it('should forward headers to fetch', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await fetchPage(
      'https://api.example.com/data',
      { Authorization: 'Bearer token' },
      'data',
    );

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/data',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token',
          Accept: 'application/json',
        }),
      }),
    );
  });
});

describe('fetchRawResponse', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should return JSON response for successful request', async () => {
    const responseData = { data: [1, 2, 3], meta: { total: 3 } };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => responseData,
    });

    const result = await fetchRawResponse(
      'https://api.example.com/data',
      null,
    );
    expect(result).toEqual(responseData);
  });

  it('should throw error for non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    });

    await expect(
      fetchRawResponse('https://api.example.com/data', null),
    ).rejects.toThrow('API responded with 403: Forbidden');
  });

  it('should include Accept header and merge with custom headers', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await fetchRawResponse('https://api.example.com/data', {
      'X-Custom': 'value',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/data',
      expect.objectContaining({
        method: 'GET',
        headers: { Accept: 'application/json', 'X-Custom': 'value' },
      }),
    );
  });

  it('should use default Accept header when no custom headers', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await fetchRawResponse('https://api.example.com/data', null);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/data',
      expect.objectContaining({
        headers: { Accept: 'application/json' },
      }),
    );
  });
});
