import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

interface FieldDefinition {
  id: string;
  name: string;
  slug: string;
  type: string;
  required: boolean;
  localizable?: boolean;
  placeholder?: string;
  options?: string[];
}

interface ContentModel {
  id: string;
  name: string;
  slug: string;
  description: string;
  fields: FieldDefinition[];
  createdAt: string;
  updatedAt: string;
}

type EntryStatus = "draft" | "published" | "archived";

interface EntryVersion {
  id: string;
  entryId: string;
  versionNumber: number;
  values: Record<string, unknown>;
  createdAt: string;
}

interface ContentEntry {
  id: string;
  modelId: string;
  values: Record<string, unknown>;
  status: EntryStatus;
  versions: EntryVersion[];
  currentVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ModelRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  fields_json: string;
  created_at: string;
  updated_at: string;
}

interface EntryRow {
  id: string;
  model_id: string;
  values_json: string;
  status: EntryStatus;
  current_version_id: string | null;
  created_at: string;
  updated_at: string;
}

interface EntryVersionRow {
  id: string;
  entry_id: string;
  version_number: number;
  values_json: string;
  created_at: string;
}

interface LocaleOption {
  code: string;
  label: string;
}

export interface LocalizationSettings {
  defaultLocale: string;
  enabledLocales: string[];
  availableLocales: LocaleOption[];
}

type CollectionName = "models" | "entries";

const DEFAULT_LOCALE = "en-US";
const AVAILABLE_LOCALE_OPTIONS: LocaleOption[] = [
  { code: "en-US", label: "English (United States)" },
  { code: "en-GB", label: "English (United Kingdom)" },
  { code: "es-ES", label: "Spanish (Spain)" },
  { code: "fr-FR", label: "French (France)" },
  { code: "de-DE", label: "German (Germany)" },
  { code: "it-IT", label: "Italian (Italy)" },
  { code: "pt-BR", label: "Portuguese (Brazil)" },
  { code: "nl-NL", label: "Dutch (Netherlands)" },
  { code: "ja-JP", label: "Japanese (Japan)" },
  { code: "zh-CN", label: "Chinese (Simplified)" },
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.CMS_DATA_DIR || path.join(__dirname, "..", "data");
const DB_PATH = process.env.CMS_DB_PATH || path.join(DATA_DIR, "content-cms.sqlite");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function legacyFilePath(collection: CollectionName): string {
  return path.join(DATA_DIR, `${collection}.json`);
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeEnabledLocales(locales: unknown): string[] {
  const allowedCodes = new Set(AVAILABLE_LOCALE_OPTIONS.map((locale) => locale.code));
  const next = Array.isArray(locales)
    ? locales.filter(
        (locale): locale is string =>
          typeof locale === "string" && allowedCodes.has(locale),
      )
    : [];
  const deduped = Array.from(new Set(next.filter((locale) => locale !== DEFAULT_LOCALE)));

  return [DEFAULT_LOCALE, ...deduped];
}

function buildLocalizationSettings(enabledLocales: unknown): LocalizationSettings {
  return {
    defaultLocale: DEFAULT_LOCALE,
    enabledLocales: normalizeEnabledLocales(enabledLocales),
    availableLocales: AVAILABLE_LOCALE_OPTIONS,
  };
}

function readLegacyCollection<T>(collection: CollectionName): T[] {
  const fp = legacyFilePath(collection);
  if (!fs.existsSync(fp)) {
    return [];
  }

  const raw = fs.readFileSync(fp, "utf-8");
  return parseJson<T[]>(raw, []);
}

function loadVersions(entryId: string): EntryVersion[] {
  const rows = db
    .prepare(
      `
        SELECT id, entry_id, version_number, values_json, created_at
        FROM entry_versions
        WHERE entry_id = ?
        ORDER BY version_number ASC
      `,
    )
    .all(entryId) as EntryVersionRow[];

  return rows.map((row) => ({
    id: row.id,
    entryId: row.entry_id,
    versionNumber: row.version_number,
    values: parseJson<Record<string, unknown>>(row.values_json, {}),
    createdAt: row.created_at,
  }));
}

function mapModel(row: ModelRow): ContentModel {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    fields: parseJson<FieldDefinition[]>(row.fields_json, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEntry(row: EntryRow): ContentEntry {
  return {
    id: row.id,
    modelId: row.model_id,
    values: parseJson<Record<string, unknown>>(row.values_json, {}),
    status: row.status,
    versions: loadVersions(row.id),
    currentVersionId: row.current_version_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function replaceEntryVersions(entryId: string, versions: EntryVersion[]) {
  const deleteVersions = db.prepare("DELETE FROM entry_versions WHERE entry_id = ?");
  const insertVersion = db.prepare(
    `
      INSERT INTO entry_versions (
        id,
        entry_id,
        version_number,
        values_json,
        created_at
      ) VALUES (?, ?, ?, ?, ?)
    `,
  );

  const syncVersions = db.transaction((nextVersions: EntryVersion[]) => {
    deleteVersions.run(entryId);
    for (const version of nextVersions) {
      insertVersion.run(
        version.id,
        entryId,
        version.versionNumber,
        JSON.stringify(version.values),
        version.createdAt,
      );
    }
  });

  syncVersions(versions);
}

function insertModel(model: ContentModel) {
  db.prepare(
    `
      INSERT INTO content_models (
        id,
        name,
        slug,
        description,
        fields_json,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    model.id,
    model.name,
    model.slug,
    model.description,
    JSON.stringify(model.fields),
    model.createdAt,
    model.updatedAt,
  );
}

function insertEntry(entry: ContentEntry) {
  const createEntry = db.prepare(
    `
      INSERT INTO content_entries (
        id,
        model_id,
        values_json,
        status,
        current_version_id,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
  );

  const createWithVersions = db.transaction((nextEntry: ContentEntry) => {
    createEntry.run(
      nextEntry.id,
      nextEntry.modelId,
      JSON.stringify(nextEntry.values),
      nextEntry.status,
      nextEntry.currentVersionId,
      nextEntry.createdAt,
      nextEntry.updatedAt,
    );
    replaceEntryVersions(nextEntry.id, nextEntry.versions);
  });

  createWithVersions(entry);
}

function updateModelRecord(model: ContentModel) {
  db.prepare(
    `
      UPDATE content_models
      SET
        name = ?,
        slug = ?,
        description = ?,
        fields_json = ?,
        created_at = ?,
        updated_at = ?
      WHERE id = ?
    `,
  ).run(
    model.name,
    model.slug,
    model.description,
    JSON.stringify(model.fields),
    model.createdAt,
    model.updatedAt,
    model.id,
  );
}

function updateEntryRecord(entry: ContentEntry, syncVersions: boolean) {
  const updateEntry = db.prepare(
    `
      UPDATE content_entries
      SET
        model_id = ?,
        values_json = ?,
        status = ?,
        current_version_id = ?,
        created_at = ?,
        updated_at = ?
      WHERE id = ?
    `,
  );

  const updateWithVersions = db.transaction(
    (nextEntry: ContentEntry, shouldSyncVersions: boolean) => {
      updateEntry.run(
        nextEntry.modelId,
        JSON.stringify(nextEntry.values),
        nextEntry.status,
        nextEntry.currentVersionId,
        nextEntry.createdAt,
        nextEntry.updatedAt,
        nextEntry.id,
      );

      if (shouldSyncVersions) {
        replaceEntryVersions(nextEntry.id, nextEntry.versions);
      }
    },
  );

  updateWithVersions(entry, syncVersions);
}

function markLegacyMigrationComplete() {
  db.prepare(
    `
      INSERT INTO app_metadata (key, value)
      VALUES ('legacy_json_migrated', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
  ).run(new Date().toISOString());
}

function hasLegacyMigrationCompleted(): boolean {
  const row = db
    .prepare("SELECT value FROM app_metadata WHERE key = 'legacy_json_migrated'")
    .get() as { value: string } | undefined;

  return Boolean(row?.value);
}

function migrateLegacyJsonData() {
  if (hasLegacyMigrationCompleted()) {
    return;
  }

  const hasExistingRows =
    (db.prepare("SELECT COUNT(*) AS count FROM content_models").get() as {
      count: number;
    }).count > 0 ||
    (db.prepare("SELECT COUNT(*) AS count FROM content_entries").get() as {
      count: number;
    }).count > 0 ||
    (db.prepare("SELECT COUNT(*) AS count FROM entry_versions").get() as {
      count: number;
    }).count > 0;

  if (hasExistingRows) {
    markLegacyMigrationComplete();
    return;
  }

  const models = readLegacyCollection<ContentModel>("models");
  const entries = readLegacyCollection<ContentEntry>("entries");

  if (models.length === 0 && entries.length === 0) {
    markLegacyMigrationComplete();
    return;
  }

  // Import any previously persisted JSON data into SQLite once on first boot.
  const migrate = db.transaction(() => {
    for (const model of models) {
      insertModel(model);
    }

    for (const entry of entries) {
      insertEntry({
        ...entry,
        versions: Array.isArray(entry.versions) ? entry.versions : [],
      });
    }

    markLegacyMigrationComplete();
  });

  migrate();
}

function initDatabase() {
  ensureDir();

  const database = new Database(DB_PATH);
  database.pragma("foreign_keys = ON");
  database.pragma("journal_mode = WAL");

  database.exec(`
    CREATE TABLE IF NOT EXISTS content_models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      fields_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS content_entries (
      id TEXT PRIMARY KEY,
      model_id TEXT NOT NULL,
      values_json TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
      current_version_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (model_id) REFERENCES content_models(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS entry_versions (
      id TEXT PRIMARY KEY,
      entry_id TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      values_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (entry_id) REFERENCES content_entries(id) ON DELETE CASCADE,
      UNIQUE (entry_id, version_number)
    );

    CREATE INDEX IF NOT EXISTS idx_content_entries_model_id
      ON content_entries(model_id);

    CREATE INDEX IF NOT EXISTS idx_entry_versions_entry_id
      ON entry_versions(entry_id);

    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  return database;
}

function assertCollection(collection: string): asserts collection is CollectionName {
  if (collection !== "models" && collection !== "entries") {
    throw new Error(`Unsupported collection: ${collection}`);
  }
}

const db = initDatabase();
migrateLegacyJsonData();

export function getAll<T>(collection: string): T[] {
  assertCollection(collection);

  if (collection === "models") {
    const rows = db
      .prepare(
        `
          SELECT id, name, slug, description, fields_json, created_at, updated_at
          FROM content_models
          ORDER BY created_at ASC
        `,
      )
      .all() as ModelRow[];

    return rows.map((row) => mapModel(row) as unknown as T);
  }

  const rows = db
    .prepare(
      `
        SELECT id, model_id, values_json, status, current_version_id, created_at, updated_at
        FROM content_entries
        ORDER BY created_at ASC
      `,
    )
    .all() as EntryRow[];

  return rows.map((row) => mapEntry(row) as unknown as T);
}

export function getById<T extends { id: string }>(
  collection: string,
  id: string,
): T | undefined {
  assertCollection(collection);

  if (collection === "models") {
    const row = db
      .prepare(
        `
          SELECT id, name, slug, description, fields_json, created_at, updated_at
          FROM content_models
          WHERE id = ?
        `,
      )
      .get(id) as ModelRow | undefined;

    return row ? (mapModel(row) as unknown as T) : undefined;
  }

  const row = db
    .prepare(
      `
        SELECT id, model_id, values_json, status, current_version_id, created_at, updated_at
        FROM content_entries
        WHERE id = ?
      `,
    )
    .get(id) as EntryRow | undefined;

  return row ? (mapEntry(row) as unknown as T) : undefined;
}

export function create<T extends { id: string }>(
  collection: string,
  item: T,
): T {
  assertCollection(collection);

  if (collection === "models") {
    insertModel(item as unknown as ContentModel);
    return item;
  }

  insertEntry(item as unknown as ContentEntry);
  return item;
}

export function update<T extends { id: string }>(
  collection: string,
  id: string,
  updates: Partial<T>,
): T | undefined {
  assertCollection(collection);

  const existing = getById<T>(collection, id);
  if (!existing) {
    return undefined;
  }

  const nextItem = { ...existing, ...updates };

  if (collection === "models") {
    updateModelRecord(nextItem as unknown as ContentModel);
    return getById<T>(collection, id);
  }

  updateEntryRecord(
    nextItem as unknown as ContentEntry,
    Object.prototype.hasOwnProperty.call(updates, "versions"),
  );
  return getById<T>(collection, id);
}

export function remove<T extends { id: string }>(
  collection: string,
  id: string,
): boolean {
  assertCollection(collection);

  const result =
    collection === "models"
      ? db.prepare("DELETE FROM content_models WHERE id = ?").run(id)
      : db.prepare("DELETE FROM content_entries WHERE id = ?").run(id);

  return result.changes > 0;
}

export function findByField<T>(
  collection: string,
  field: string,
  value: unknown,
): T[] {
  assertCollection(collection);

  if (collection === "entries" && field === "modelId") {
    const rows = db
      .prepare(
        `
          SELECT id, model_id, values_json, status, current_version_id, created_at, updated_at
          FROM content_entries
          WHERE model_id = ?
          ORDER BY created_at ASC
        `,
      )
      .all(String(value)) as EntryRow[];

    return rows.map((row) => mapEntry(row) as unknown as T);
  }

  return getAll<Record<string, unknown>>(collection).filter(
    (item) => item[field] === value,
  ) as T[];
}

export function removeByField<T>(
  collection: string,
  field: string,
  value: unknown,
): number {
  assertCollection(collection);

  if (collection === "entries" && field === "modelId") {
    const result = db
      .prepare("DELETE FROM content_entries WHERE model_id = ?")
      .run(String(value));

    return result.changes;
  }

  return 0;
}

export function getLocalizationSettings(): LocalizationSettings {
  const row = db
    .prepare("SELECT value FROM app_metadata WHERE key = 'localization_settings'")
    .get() as { value: string } | undefined;

  const parsed = row
    ? parseJson<{ enabledLocales?: string[] }>(row.value, {})
    : undefined;

  return buildLocalizationSettings(parsed?.enabledLocales);
}

export function updateLocalizationSettings(
  enabledLocales: string[],
): LocalizationSettings {
  const settings = buildLocalizationSettings(enabledLocales);

  db.prepare(
    `
      INSERT INTO app_metadata (key, value)
      VALUES ('localization_settings', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
  ).run(
    JSON.stringify({
      enabledLocales: settings.enabledLocales,
    }),
  );

  return settings;
}
