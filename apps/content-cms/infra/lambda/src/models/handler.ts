import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { getItem, putItem, deleteItem, scanAll, batchDeleteByIds, queryByIndex } from '../utils/dynamo.js';
import { extractAuthContext, parseBody } from '../utils/tenant.js';
import { success, error, notFound } from '../utils/response.js';
import type { ContentModel, FieldDefinition } from '../types.js';
import { LOCALIZABLE_FIELD_TYPES } from '../types.js';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

function toFieldDefinition(field: Partial<FieldDefinition>): FieldDefinition | null {
  if (typeof field.name !== 'string' || typeof field.type !== 'string') return null;
  const supportsLocalization = LOCALIZABLE_FIELD_TYPES.has(field.type);

  return {
    id: typeof field.id === 'string' && field.id ? field.id : uuidv4(),
    name: field.name,
    slug: typeof field.slug === 'string' && field.slug ? field.slug : slugify(field.name),
    type: field.type,
    required: Boolean(field.required),
    localizable: supportsLocalization ? Boolean(field.localizable) : false,
    placeholder: typeof field.placeholder === 'string' ? field.placeholder : undefined,
    options: Array.isArray(field.options)
      ? field.options.filter((o): o is string => typeof o === 'string')
      : undefined,
  };
}

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const ctx = extractAuthContext(event);
  const method = event.httpMethod;
  const resource = event.resource;
  const id = event.pathParameters?.['id'];

  // GET /api/models
  if (method === 'GET' && resource === '/api/models') {
    const models = await scanAll<ContentModel>(ctx.modelsTable);
    models.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return success(models);
  }

  // GET /api/models/{id}
  if (method === 'GET' && resource === '/api/models/{id}') {
    const model = await getItem<ContentModel>(ctx.modelsTable, { id: id! });
    if (!model) return notFound('Model not found');
    return success(model);
  }

  // POST /api/models
  if (method === 'POST' && resource === '/api/models') {
    const body = parseBody<{ name?: string; description?: string; fields?: Partial<FieldDefinition>[] }>(event.body);

    if (!body.name || !body.fields || !Array.isArray(body.fields)) {
      return error('Name and fields are required');
    }

    const fieldDefs = body.fields.map(f => toFieldDefinition(f));
    const validFields = fieldDefs.filter((f): f is FieldDefinition => f !== null);
    if (validFields.length !== body.fields.length) {
      return error('Each field must include a name and type');
    }

    const now = new Date().toISOString();
    const model: ContentModel = {
      id: uuidv4(),
      companyId: ctx.tenantId,
      name: body.name,
      slug: slugify(body.name),
      description: body.description ?? '',
      fields: validFields,
      createdAt: now,
      updatedAt: now,
    };

    await putItem(ctx.modelsTable, model as unknown as Record<string, unknown>);
    return success(model, 201);
  }

  // PUT /api/models/{id}
  if (method === 'PUT' && resource === '/api/models/{id}') {
    const existing = await getItem<ContentModel>(ctx.modelsTable, { id: id! });
    if (!existing) return notFound('Model not found');

    const body = parseBody<{ name?: string; description?: string; fields?: Partial<FieldDefinition>[] }>(event.body);
    const updated = { ...existing, updatedAt: new Date().toISOString() };

    if (body.name) {
      updated.name = body.name;
      updated.slug = slugify(body.name);
    }
    if (body.description !== undefined) updated.description = body.description;
    if (body.fields && Array.isArray(body.fields)) {
      const fieldDefs = body.fields.map(f => toFieldDefinition(f));
      const validFields = fieldDefs.filter((f): f is FieldDefinition => f !== null);
      if (validFields.length !== body.fields.length) {
        return error('Each field must include a name and type');
      }
      updated.fields = validFields;
    }

    await putItem(ctx.modelsTable, updated as unknown as Record<string, unknown>);
    return success(updated);
  }

  // DELETE /api/models/{id}
  if (method === 'DELETE' && resource === '/api/models/{id}') {
    const existing = await getItem<ContentModel>(ctx.modelsTable, { id: id! });
    if (!existing) return notFound('Model not found');

    await deleteItem(ctx.modelsTable, { id: id! });

    // Cascade delete entries and their versions
    const entries = await queryByIndex<{ id: string }>(
      ctx.entriesTable, 'ModelIdIndex', 'modelId', id!,
    );
    if (entries.length > 0) {
      for (const entry of entries) {
        const versions = await queryByIndex<{ id: string }>(
          ctx.versionsTable, 'EntryIdIndex', 'entryId', entry.id,
        );
        if (versions.length > 0) {
          await batchDeleteByIds(ctx.versionsTable, versions.map(v => v.id));
        }
      }
      await batchDeleteByIds(ctx.entriesTable, entries.map(e => e.id));
    }

    return success(undefined);
  }

  return error('Not found', 404);
};
