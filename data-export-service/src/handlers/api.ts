import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from 'aws-lambda';
import { getConfig } from '../config';
import { validateCreateExport, isValidUuid } from '../lib/validator';
import { jsonResponse, errorResponse } from '../lib/response';
import {
  createExportJob,
  getExportJob,
  toStatusResponse,
} from '../services/export-job.service';
import { enqueueExportJob } from '../services/queue.service';

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod;
  const resourcePath = event.resource;

  try {
    if (method === 'OPTIONS') {
      return jsonResponse(200, {});
    }

    if (method === 'POST' && resourcePath === '/api/v1/exports') {
      return await handleCreateExport(event);
    }

    if (method === 'GET' && resourcePath === '/api/v1/exports/{id}') {
      return await handleGetExportStatus(event);
    }

    return errorResponse(404, 'Not Found', event.path);
  } catch (error) {
    console.error(
      `Unhandled exception on ${method} ${event.path}`,
      error instanceof Error ? error.stack : String(error),
    );
    return errorResponse(500, 'Internal server error', event.path);
  }
}

async function handleCreateExport(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  let body: unknown;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return errorResponse(400, 'Invalid JSON body', event.path);
  }

  const validation = validateCreateExport(body);
  if (validation.errors.length > 0) {
    return errorResponse(400, validation.errors, event.path);
  }

  const cfg = getConfig();
  const job = await createExportJob(
    validation.dto!,
    cfg.export.defaultPageSize,
  );
  await enqueueExportJob(job.id);

  console.log(`Export job ${job.id} created for ${job.apiUrl}`);

  return jsonResponse(202, toStatusResponse(job));
}

async function handleGetExportStatus(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const id = event.pathParameters?.id;

  if (!id || !isValidUuid(id)) {
    return errorResponse(
      400,
      'Validation failed (uuid is expected)',
      event.path,
    );
  }

  const job = await getExportJob(id);
  if (!job) {
    return errorResponse(404, `Export job ${id} not found`, event.path);
  }

  return jsonResponse(200, toStatusResponse(job));
}
