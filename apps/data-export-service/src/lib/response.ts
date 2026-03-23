import type { APIGatewayProxyResult } from 'aws-lambda';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

export function jsonResponse(
  statusCode: number,
  body: unknown,
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    body: JSON.stringify(body),
  };
}

export function errorResponse(
  statusCode: number,
  message: string | string[],
  path: string,
): APIGatewayProxyResult {
  const errorName =
    statusCode === 400
      ? 'Bad Request'
      : statusCode === 404
        ? 'Not Found'
        : statusCode === 429
          ? 'Too Many Requests'
          : 'Internal Server Error';

  return jsonResponse(statusCode, {
    statusCode,
    timestamp: new Date().toISOString(),
    path,
    message,
    error: errorName,
  });
}
