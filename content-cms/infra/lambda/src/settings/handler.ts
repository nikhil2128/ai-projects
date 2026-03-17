import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getItem, putItem } from '../utils/dynamo.js';
import { extractAuthContext, parseBody } from '../utils/tenant.js';
import { success, error } from '../utils/response.js';
import { AVAILABLE_LOCALE_OPTIONS, DEFAULT_LOCALE } from '../types.js';
import type { LocalizationSettings } from '../types.js';

function buildLocalizationSettings(enabledLocales: unknown): LocalizationSettings {
  const allowedCodes = new Set(AVAILABLE_LOCALE_OPTIONS.map(l => l.code));
  const raw = Array.isArray(enabledLocales)
    ? enabledLocales.filter((c): c is string => typeof c === 'string' && allowedCodes.has(c))
    : [];
  const deduped = [DEFAULT_LOCALE, ...new Set(raw.filter(c => c !== DEFAULT_LOCALE))];
  return {
    defaultLocale: DEFAULT_LOCALE,
    enabledLocales: deduped,
    availableLocales: AVAILABLE_LOCALE_OPTIONS,
  };
}

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const ctx = extractAuthContext(event);
  const method = event.httpMethod;

  if (method === 'GET') {
    const row = await getItem<{ settingKey: string; settingValue: string }>(
      ctx.settingsTable, { settingKey: 'localization' },
    );

    let parsed: { enabledLocales?: string[] } = {};
    if (row) {
      try { parsed = JSON.parse(row.settingValue); } catch { /* default */ }
    }

    return success(buildLocalizationSettings(parsed.enabledLocales));
  }

  if (method === 'PUT') {
    const body = parseBody<{ enabledLocales?: unknown }>(event.body);
    if (!Array.isArray(body.enabledLocales)) {
      return error('enabledLocales must be an array');
    }

    const settings = buildLocalizationSettings(body.enabledLocales);

    await putItem(ctx.settingsTable, {
      settingKey: 'localization',
      settingValue: JSON.stringify({ enabledLocales: settings.enabledLocales }),
      updatedAt: new Date().toISOString(),
    });

    return success(settings);
  }

  return error('Not found', 404);
};
