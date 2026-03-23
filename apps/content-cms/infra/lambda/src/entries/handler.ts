import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { getItem, putItem, deleteItem, queryByIndex, batchDeleteByIds } from '../utils/dynamo.js';
import { extractAuthContext, parseBody, requireRole } from '../utils/tenant.js';
import { success, error, notFound, forbidden } from '../utils/response.js';
import type { ContentEntry, ContentModel, EntryVersion, LocalizationSettings } from '../types.js';
import { AVAILABLE_LOCALE_OPTIONS, DEFAULT_LOCALE, LOCALIZABLE_FIELD_TYPES } from '../types.js';

function isObj(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v);
}

function cloneValues(values: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(values));
}

function normalizeEntry(entry: Partial<ContentEntry>): ContentEntry {
  const ts = new Date().toISOString();
  return {
    id: entry.id ?? '',
    companyId: entry.companyId ?? '',
    modelId: entry.modelId ?? '',
    values: isObj(entry.values) ? entry.values : {},
    status: entry.status === 'published' || entry.status === 'draft' || entry.status === 'archived'
      ? entry.status : 'draft',
    versions: Array.isArray(entry.versions) ? entry.versions : [],
    currentVersionId: typeof entry.currentVersionId === 'string' ? entry.currentVersionId : null,
    createdBy: typeof entry.createdBy === 'string' ? entry.createdBy : null,
    createdAt: entry.createdAt ?? ts,
    updatedAt: entry.updatedAt ?? ts,
  };
}

async function getLocSettings(settingsTable: string): Promise<LocalizationSettings> {
  const row = await getItem<{ settingKey: string; settingValue: string }>(
    settingsTable, { settingKey: 'localization' },
  );
  const allowedCodes = new Set(AVAILABLE_LOCALE_OPTIONS.map(l => l.code));
  if (row) {
    try {
      const parsed = JSON.parse(row.settingValue) as { enabledLocales?: string[] };
      const locales = (parsed.enabledLocales ?? []).filter(c => allowedCodes.has(c));
      const deduped = [DEFAULT_LOCALE, ...new Set(locales.filter(c => c !== DEFAULT_LOCALE))];
      return { defaultLocale: DEFAULT_LOCALE, enabledLocales: deduped, availableLocales: AVAILABLE_LOCALE_OPTIONS };
    } catch { /* fall through */ }
  }
  return { defaultLocale: DEFAULT_LOCALE, enabledLocales: [DEFAULT_LOCALE], availableLocales: AVAILABLE_LOCALE_OPTIONS };
}

function sanitizeEntryValues(
  model: ContentModel,
  settings: LocalizationSettings,
  values: Record<string, unknown>,
): { values?: Record<string, unknown>; error?: string } {
  const fieldBySlug = new Map(model.fields.map(f => [f.slug, f]));
  const sanitized = cloneValues(values);

  for (const [slug, rawValue] of Object.entries(values)) {
    const field = fieldBySlug.get(slug);
    if (!field?.localizable) continue;

    if (rawValue === undefined) continue;

    if (isObj(rawValue)) {
      const next: Record<string, unknown> = {};
      for (const [locale, localeVal] of Object.entries(rawValue)) {
        if (!settings.enabledLocales.includes(locale)) {
          return { error: `${field.name}: Unsupported locale "${locale}". Enable it in localization settings first.` };
        }
        next[locale] = localeVal;
      }
      sanitized[slug] = next;
    } else {
      sanitized[slug] = { [settings.defaultLocale]: rawValue };
    }
  }

  return { values: sanitized };
}

async function loadVersionsForEntry(
  versionsTable: string,
  entryId: string,
): Promise<EntryVersion[]> {
  const versions = await queryByIndex<EntryVersion>(versionsTable, 'EntryIdIndex', 'entryId', entryId);
  versions.sort((a, b) => a.versionNumber - b.versionNumber);
  return versions;
}

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const ctx = extractAuthContext(event);
  const method = event.httpMethod;
  const resource = event.resource;
  const id = event.pathParameters?.['id'];
  const modelId = event.pathParameters?.['modelId'];

  // GET /api/entries/model/{modelId}
  if (method === 'GET' && resource === '/api/entries/model/{modelId}') {
    const entries = await queryByIndex<ContentEntry>(
      ctx.entriesTable, 'ModelIdIndex', 'modelId', modelId!,
    );
    const enriched = await Promise.all(entries.map(async (e) => {
      const versions = await loadVersionsForEntry(ctx.versionsTable, e.id);
      return normalizeEntry({ ...e, versions });
    }));
    enriched.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return success(enriched);
  }

  // GET /api/entries/{id}/versions
  if (method === 'GET' && resource === '/api/entries/{id}/versions') {
    const entry = await getItem<ContentEntry>(ctx.entriesTable, { id: id! });
    if (!entry) return notFound('Entry not found');

    const versions = await loadVersionsForEntry(ctx.versionsTable, id!);
    const sorted = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
    return success(sorted);
  }

  // GET /api/entries/{id}
  if (method === 'GET' && resource === '/api/entries/{id}') {
    const entry = await getItem<ContentEntry>(ctx.entriesTable, { id: id! });
    if (!entry) return notFound('Entry not found');
    const versions = await loadVersionsForEntry(ctx.versionsTable, id!);
    return success(normalizeEntry({ ...entry, versions }));
  }

  // POST /api/entries
  if (method === 'POST' && resource === '/api/entries') {
    const roleErr = requireRole(ctx, 'writer', 'reviewer', 'approver');
    if (roleErr) return forbidden(roleErr);

    const body = parseBody<{ modelId?: string; values?: unknown }>(event.body);
    if (!body.modelId || !isObj(body.values)) {
      return error('modelId and values are required');
    }

    const model = await getItem<ContentModel>(ctx.modelsTable, { id: body.modelId });
    if (!model) return notFound('Content model not found');

    const settings = await getLocSettings(ctx.settingsTable);
    const sanitized = sanitizeEntryValues(model, settings, body.values);
    if (sanitized.error || !sanitized.values) {
      return error(sanitized.error ?? 'Invalid entry values');
    }

    const now = new Date().toISOString();
    const entry: ContentEntry = {
      id: uuidv4(),
      companyId: ctx.tenantId,
      modelId: body.modelId,
      values: sanitized.values,
      status: 'draft',
      versions: [],
      currentVersionId: null,
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    };

    const { versions, ...entryRecord } = entry;
    await putItem(ctx.entriesTable, entryRecord as unknown as Record<string, unknown>);
    return success(entry, 201);
  }

  // PUT /api/entries/{id}/publish
  if (method === 'PUT' && resource === '/api/entries/{id}/publish') {
    const roleErr = requireRole(ctx, 'approver');
    if (roleErr) return forbidden(roleErr);

    const entry = await getItem<ContentEntry>(ctx.entriesTable, { id: id! });
    if (!entry) return notFound('Entry not found');

    const existing = normalizeEntry(entry);
    const existingVersions = await loadVersionsForEntry(ctx.versionsTable, id!);
    const now = new Date().toISOString();

    const version: EntryVersion = {
      id: uuidv4(),
      entryId: id!,
      versionNumber: existingVersions.length + 1,
      values: cloneValues(existing.values),
      createdAt: now,
    };

    await putItem(ctx.versionsTable, version as unknown as Record<string, unknown>);

    const updated = {
      ...entry,
      status: 'published' as const,
      currentVersionId: version.id,
      updatedAt: now,
    };
    await putItem(ctx.entriesTable, updated as unknown as Record<string, unknown>);

    const allVersions = [...existingVersions, version];
    return success(normalizeEntry({ ...updated, versions: allVersions }));
  }

  // PUT /api/entries/{id}/archive
  if (method === 'PUT' && resource === '/api/entries/{id}/archive') {
    const roleErr = requireRole(ctx, 'approver');
    if (roleErr) return forbidden(roleErr);

    const entry = await getItem<ContentEntry>(ctx.entriesTable, { id: id! });
    if (!entry) return notFound('Entry not found');

    const updated = { ...entry, status: 'archived' as const, updatedAt: new Date().toISOString() };
    await putItem(ctx.entriesTable, updated as unknown as Record<string, unknown>);

    const versions = await loadVersionsForEntry(ctx.versionsTable, id!);
    return success(normalizeEntry({ ...updated, versions }));
  }

  // PUT /api/entries/{id}/unpublish
  if (method === 'PUT' && resource === '/api/entries/{id}/unpublish') {
    const roleErr = requireRole(ctx, 'approver');
    if (roleErr) return forbidden(roleErr);

    const entry = await getItem<ContentEntry>(ctx.entriesTable, { id: id! });
    if (!entry) return notFound('Entry not found');

    const updated = { ...entry, status: 'draft' as const, updatedAt: new Date().toISOString() };
    await putItem(ctx.entriesTable, updated as unknown as Record<string, unknown>);

    const versions = await loadVersionsForEntry(ctx.versionsTable, id!);
    return success(normalizeEntry({ ...updated, versions }));
  }

  // PUT /api/entries/{id}
  if (method === 'PUT' && resource === '/api/entries/{id}') {
    const roleErr = requireRole(ctx, 'writer', 'reviewer', 'approver');
    if (roleErr) return forbidden(roleErr);

    const entry = await getItem<ContentEntry>(ctx.entriesTable, { id: id! });
    if (!entry) return notFound('Entry not found');

    const existing = normalizeEntry(entry);
    if (existing.createdBy && existing.createdBy !== ctx.userId && ctx.role === 'writer') {
      return forbidden('You can only edit your own entries');
    }

    const body = parseBody<{ values?: unknown }>(event.body);
    const updated = { ...entry, updatedAt: new Date().toISOString() };

    if (body.values !== undefined) {
      if (!isObj(body.values)) return error('values must be an object');

      const model = await getItem<ContentModel>(ctx.modelsTable, { id: existing.modelId });
      if (!model) return notFound('Content model not found');

      const settings = await getLocSettings(ctx.settingsTable);
      const sanitized = sanitizeEntryValues(model, settings, body.values);
      if (sanitized.error || !sanitized.values) {
        return error(sanitized.error ?? 'Invalid entry values');
      }

      (updated as Record<string, unknown>)['values'] = sanitized.values;
      if (JSON.stringify(existing.values) !== JSON.stringify(sanitized.values)) {
        (updated as Record<string, unknown>)['status'] = 'draft';
      }
    }

    await putItem(ctx.entriesTable, updated as unknown as Record<string, unknown>);

    const versions = await loadVersionsForEntry(ctx.versionsTable, id!);
    return success(normalizeEntry({ ...updated, versions } as Partial<ContentEntry>));
  }

  // DELETE /api/entries/{id}
  if (method === 'DELETE' && resource === '/api/entries/{id}') {
    const roleErr = requireRole(ctx, 'writer', 'reviewer', 'approver');
    if (roleErr) return forbidden(roleErr);

    const entry = await getItem<ContentEntry>(ctx.entriesTable, { id: id! });
    if (!entry) return notFound('Entry not found');

    const normalized = normalizeEntry(entry);
    if (normalized.createdBy && normalized.createdBy !== ctx.userId && ctx.role === 'writer') {
      return forbidden('You can only delete your own entries');
    }

    const versions = await queryByIndex<{ id: string }>(
      ctx.versionsTable, 'EntryIdIndex', 'entryId', id!,
    );
    if (versions.length > 0) {
      await batchDeleteByIds(ctx.versionsTable, versions.map(v => v.id));
    }
    await deleteItem(ctx.entriesTable, { id: id! });

    return success(undefined);
  }

  return error('Not found', 404);
};
