import type { APIGatewayProxyResult } from 'aws-lambda';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Content-Type': 'application/json',
};

export function success(data: unknown, statusCode = 200): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({ success: true, data }),
  };
}

export function error(message: string, statusCode = 400): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({ success: false, error: message }),
  };
}

export function notFound(message = 'Not found'): APIGatewayProxyResult {
  return error(message, 404);
}

export function forbidden(message = 'Access denied'): APIGatewayProxyResult {
  return error(message, 403);
}

export function unauthorized(message = 'Authentication required'): APIGatewayProxyResult {
  return error(message, 401);
}
