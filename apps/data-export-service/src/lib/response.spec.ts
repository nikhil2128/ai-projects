import { jsonResponse, errorResponse } from './response';

describe('jsonResponse', () => {
  it('should return a properly formatted API Gateway response', () => {
    const result = jsonResponse(200, { id: '123', status: 'ok' });

    expect(result.statusCode).toBe(200);
    expect(result.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }),
    );
    expect(JSON.parse(result.body)).toEqual({ id: '123', status: 'ok' });
  });

  it('should handle 202 status', () => {
    const result = jsonResponse(202, { message: 'accepted' });
    expect(result.statusCode).toBe(202);
  });
});

describe('errorResponse', () => {
  it('should format a 400 error', () => {
    const result = errorResponse(400, 'Invalid input', '/api/v1/exports');
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(400);
    expect(body.statusCode).toBe(400);
    expect(body.message).toBe('Invalid input');
    expect(body.error).toBe('Bad Request');
    expect(body.path).toBe('/api/v1/exports');
    expect(body.timestamp).toBeDefined();
  });

  it('should format a 404 error', () => {
    const result = errorResponse(404, 'Not found', '/api/v1/exports/123');
    const body = JSON.parse(result.body);

    expect(body.error).toBe('Not Found');
  });

  it('should format a 500 error', () => {
    const result = errorResponse(
      500,
      'Internal server error',
      '/api/v1/exports',
    );
    const body = JSON.parse(result.body);

    expect(body.error).toBe('Internal Server Error');
  });

  it('should support array of error messages', () => {
    const result = errorResponse(
      400,
      ['field1 is required', 'field2 is invalid'],
      '/api/v1/exports',
    );
    const body = JSON.parse(result.body);

    expect(body.message).toEqual([
      'field1 is required',
      'field2 is invalid',
    ]);
  });

  it('should include ISO timestamp', () => {
    const result = errorResponse(400, 'test', '/test');
    const body = JSON.parse(result.body);
    expect(() => new Date(body.timestamp).toISOString()).not.toThrow();
  });
});
