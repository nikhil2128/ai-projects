import crypto from "crypto";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { hashPassword } from "./crypto.js";

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
	companyId: string;
	name: string;
	slug: string;
	description: string;
	fields: FieldDefinition[];
	createdAt: string;
	updatedAt: string;
}

type EntryStatus = "draft" | "published" | "archived";
export type UserRole = "writer" | "reviewer" | "approver";

interface EntryVersion {
	id: string;
	entryId: string;
	versionNumber: number;
	values: Record<string, unknown>;
	createdAt: string;
}

interface ContentEntry {
	id: string;
	companyId: string;
	modelId: string;
	values: Record<string, unknown>;
	status: EntryStatus;
	versions: EntryVersion[];
	currentVersionId: string | null;
	createdBy: string | null;
	createdAt: string;
	updatedAt: string;
}

interface ModelRow {
	id: string;
	company_id: string;
	name: string;
	slug: string;
	description: string;
	fields_json: string;
	created_at: string;
	updated_at: string;
}

interface EntryRow {
	id: string;
	company_id: string;
	model_id: string;
	values_json: string;
	status: EntryStatus;
	current_version_id: string | null;
	created_by: string | null;
	created_at: string;
	updated_at: string;
}

export interface UserRow {
	id: string;
	company_id: string;
	username: string;
	password_hash: string;
	password_salt: string;
	display_name: string;
	role: UserRole;
	created_at: string;
}

interface EntryVersionRow {
	id: string;
	entry_id: string;
	version_number: number;
	values_json: string;
	created_at: string;
}

interface CompanyRow {
	id: string;
	name: string;
	slug: string;
	created_at: string;
}

interface LocaleOption {
	code: string;
	label: string;
}

export interface Company {
	id: string;
	name: string;
	slug: string;
	createdAt: string;
}

export interface CompanyUser {
	id: string;
	companyId: string;
	username: string;
	displayName: string;
	role: UserRole;
	createdAt: string;
}

export interface LocalizationSettings {
	defaultLocale: string;
	enabledLocales: string[];
	availableLocales: LocaleOption[];
}

export interface CreateCompanyInput {
	companyName: string;
	companySlug: string;
	adminUsername: string;
	adminDisplayName: string;
	password: string;
}

export interface CreateCompanyUserInput {
	username: string;
	displayName: string;
	password: string;
	role: UserRole;
}

type CollectionName = "models" | "entries";

const DEFAULT_LOCALE = "en-US";
const DEFAULT_COMPANY_NAME = "Demo Company";
const DEFAULT_COMPANY_SLUG = "demo-company";
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
const DB_PATH =
	process.env.CMS_DB_PATH || path.join(DATA_DIR, "content-cms.sqlite");

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

function mapCompany(row: CompanyRow): Company {
	return {
		id: row.id,
		name: row.name,
		slug: row.slug,
		createdAt: row.created_at,
	};
}

function mapCompanyUser(row: UserRow): CompanyUser {
	return {
		id: row.id,
		companyId: row.company_id,
		username: row.username,
		displayName: row.display_name,
		role: row.role,
		createdAt: row.created_at,
	};
}

function normalizeEnabledLocales(locales: unknown): string[] {
	const allowedCodes = new Set(
		AVAILABLE_LOCALE_OPTIONS.map((locale) => locale.code),
	);
	const next = Array.isArray(locales)
		? locales.filter(
				(locale): locale is string =>
					typeof locale === "string" && allowedCodes.has(locale),
			)
		: [];
	const deduped = Array.from(
		new Set(next.filter((locale) => locale !== DEFAULT_LOCALE)),
	);

	return [DEFAULT_LOCALE, ...deduped];
}

function buildLocalizationSettings(
	enabledLocales: unknown,
): LocalizationSettings {
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
		companyId: row.company_id,
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
		companyId: row.company_id,
		modelId: row.model_id,
		values: parseJson<Record<string, unknown>>(row.values_json, {}),
		status: row.status,
		versions: loadVersions(row.id),
		currentVersionId: row.current_version_id,
		createdBy: row.created_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function replaceEntryVersions(entryId: string, versions: EntryVersion[]) {
	const deleteVersions = db.prepare(
		"DELETE FROM entry_versions WHERE entry_id = ?",
	);
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
        company_id,
        name,
        slug,
        description,
        fields_json,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
	).run(
		model.id,
		model.companyId,
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
        company_id,
        model_id,
        values_json,
        status,
        current_version_id,
        created_by,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
	);

	const createWithVersions = db.transaction((nextEntry: ContentEntry) => {
		createEntry.run(
			nextEntry.id,
			nextEntry.companyId,
			nextEntry.modelId,
			JSON.stringify(nextEntry.values),
			nextEntry.status,
			nextEntry.currentVersionId,
			nextEntry.createdBy,
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
      WHERE id = ? AND company_id = ?
    `,
	).run(
		model.name,
		model.slug,
		model.description,
		JSON.stringify(model.fields),
		model.createdAt,
		model.updatedAt,
		model.id,
		model.companyId,
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
      WHERE id = ? AND company_id = ?
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
				nextEntry.companyId,
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
		.prepare(
			"SELECT value FROM app_metadata WHERE key = 'legacy_json_migrated'",
		)
		.get() as { value: string } | undefined;

	return Boolean(row?.value);
}

function migrateLegacyJsonData(defaultCompanyId: string) {
	if (hasLegacyMigrationCompleted()) {
		return;
	}

	const hasExistingRows =
		(
			db.prepare("SELECT COUNT(*) AS count FROM content_models").get() as {
				count: number;
			}
		).count > 0 ||
		(
			db.prepare("SELECT COUNT(*) AS count FROM content_entries").get() as {
				count: number;
			}
		).count > 0 ||
		(
			db.prepare("SELECT COUNT(*) AS count FROM entry_versions").get() as {
				count: number;
			}
		).count > 0;

	if (hasExistingRows) {
		markLegacyMigrationComplete();
		return;
	}

	const models = readLegacyCollection<Omit<ContentModel, "companyId">>("models");
	const entries = readLegacyCollection<Omit<ContentEntry, "companyId">>("entries");

	if (models.length === 0 && entries.length === 0) {
		markLegacyMigrationComplete();
		return;
	}

	const migrate = db.transaction(() => {
		for (const model of models) {
			insertModel({ ...model, companyId: defaultCompanyId });
		}

		for (const entry of entries) {
			insertEntry({
				...entry,
				companyId: defaultCompanyId,
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
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('writer', 'reviewer', 'approver')),
      created_at TEXT NOT NULL
    );

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
      created_by TEXT,
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

    CREATE TABLE IF NOT EXISTS company_settings (
      company_id TEXT PRIMARY KEY,
      localization_settings_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
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

function tableColumns(tableName: string): { name: string }[] {
	return db.pragma(`table_info(${tableName})`) as { name: string }[];
}

function ensureDefaultCompany(): string {
	const existing = getCompanyBySlug(DEFAULT_COMPANY_SLUG);
	if (existing) {
		return existing.id;
	}

	const firstCompany = db
		.prepare("SELECT id, name, slug, created_at FROM companies ORDER BY created_at ASC LIMIT 1")
		.get() as CompanyRow | undefined;
	if (firstCompany) {
		return firstCompany.id;
	}

	const companyId = crypto.randomUUID();
	db.prepare(
		`
      INSERT INTO companies (id, name, slug, created_at)
      VALUES (?, ?, ?, ?)
    `,
	).run(
		companyId,
		DEFAULT_COMPANY_NAME,
		DEFAULT_COMPANY_SLUG,
		new Date().toISOString(),
	);
	return companyId;
}

function migrateUsersTable(defaultCompanyId: string) {
	const columns = tableColumns("users");
	if (
		columns.some((column) => column.name === "company_id") &&
		columns.some((column) => column.name === "username")
	) {
		db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_company_username
      ON users(company_id, username)
    `);
		return;
	}

	db.exec(`
    CREATE TABLE users_v2 (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('writer', 'reviewer', 'approver')),
      created_at TEXT NOT NULL,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      UNIQUE (company_id, username)
    )
  `);

	db.prepare(
		`
      INSERT INTO users_v2 (
        id,
        company_id,
        username,
        password_hash,
        password_salt,
        display_name,
        role,
        created_at
      )
      SELECT
        id,
        ?,
        username,
        password_hash,
        password_salt,
        display_name,
        role,
        created_at
      FROM users
    `,
	).run(defaultCompanyId);

	db.exec(`
    DROP TABLE users;
    ALTER TABLE users_v2 RENAME TO users;
    CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
  `);
}

function migrateCompanyScopedColumn(tableName: "content_models" | "content_entries", defaultCompanyId: string) {
	const columns = tableColumns(tableName);
	if (!columns.some((column) => column.name === "company_id")) {
		db.exec(`ALTER TABLE ${tableName} ADD COLUMN company_id TEXT`);
	}
	if (tableName === "content_entries" && !columns.some((column) => column.name === "created_by")) {
		db.exec("ALTER TABLE content_entries ADD COLUMN created_by TEXT");
	}
	db.prepare(
		`UPDATE ${tableName} SET company_id = ? WHERE company_id IS NULL OR company_id = ''`,
	).run(defaultCompanyId);
}

function migrateLocalizationSettings(defaultCompanyId: string) {
	const existing = db
		.prepare("SELECT company_id FROM company_settings WHERE company_id = ?")
		.get(defaultCompanyId) as { company_id: string } | undefined;
	if (existing) {
		return;
	}

	const legacy = db
		.prepare(
			"SELECT value FROM app_metadata WHERE key = 'localization_settings'",
		)
		.get() as { value: string } | undefined;

	const parsed = legacy
		? parseJson<{ enabledLocales?: string[] }>(legacy.value, {})
		: {};
	const settings = buildLocalizationSettings(parsed.enabledLocales);

	db.prepare(
		`
      INSERT INTO company_settings (company_id, localization_settings_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(company_id) DO UPDATE SET
        localization_settings_json = excluded.localization_settings_json,
        updated_at = excluded.updated_at
    `,
	).run(
		defaultCompanyId,
		JSON.stringify({ enabledLocales: settings.enabledLocales }),
		new Date().toISOString(),
	);
}

function migrateSchema(): string {
	const defaultCompanyId = ensureDefaultCompany();
	migrateUsersTable(defaultCompanyId);
	migrateCompanyScopedColumn("content_models", defaultCompanyId);
	migrateCompanyScopedColumn("content_entries", defaultCompanyId);

	db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_company_id
      ON users(company_id);

    CREATE INDEX IF NOT EXISTS idx_content_models_company_id
      ON content_models(company_id);

    CREATE INDEX IF NOT EXISTS idx_content_entries_company_id
      ON content_entries(company_id);
  `);

	return defaultCompanyId;
}

function assertCollection(
	collection: string,
): asserts collection is CollectionName {
	if (collection !== "models" && collection !== "entries") {
		throw new Error(`Unsupported collection: ${collection}`);
	}
}

const db = initDatabase();
const defaultCompanyId = migrateSchema();
migrateLegacyJsonData(defaultCompanyId);
migrateLocalizationSettings(defaultCompanyId);
seedDemoUsers();

function seedDemoUsers() {
	const count = (
		db.prepare("SELECT COUNT(*) AS count FROM users").get() as {
			count: number;
		}
	).count;
	if (count > 0) return;

	const demoCompany = getCompanyBySlug(DEFAULT_COMPANY_SLUG) ?? {
		id: defaultCompanyId,
		name: DEFAULT_COMPANY_NAME,
		slug: DEFAULT_COMPANY_SLUG,
		createdAt: new Date().toISOString(),
	};

	const demoUsers: CreateCompanyUserInput[] = [
		{
			username: "alice",
			displayName: "Alice Writer",
			role: "writer",
			password: "password123",
		},
		{
			username: "bob",
			displayName: "Bob Writer",
			role: "writer",
			password: "password123",
		},
		{
			username: "carol",
			displayName: "Carol Reviewer",
			role: "reviewer",
			password: "password123",
		},
		{
			username: "dave",
			displayName: "Dave Approver",
			role: "approver",
			password: "password123",
		},
	];

	for (const user of demoUsers) {
		createCompanyUser(demoCompany.id, user);
	}
}

export function getCompanyBySlug(slug: string): Company | undefined {
	const row = db
		.prepare("SELECT id, name, slug, created_at FROM companies WHERE slug = ?")
		.get(slug) as CompanyRow | undefined;
	return row ? mapCompany(row) : undefined;
}

export function getCompanyById(id: string): Company | undefined {
	const row = db
		.prepare("SELECT id, name, slug, created_at FROM companies WHERE id = ?")
		.get(id) as CompanyRow | undefined;
	return row ? mapCompany(row) : undefined;
}

export function createCompanyWithAdmin(
	input: CreateCompanyInput,
): { company: Company; user: CompanyUser } {
	const createInTransaction = db.transaction(
		(nextInput: CreateCompanyInput): { company: Company; user: CompanyUser } => {
			const existingCompany = getCompanyBySlug(nextInput.companySlug);
			if (existingCompany) {
				throw new Error("Company slug is already in use");
			}

			const companyId = crypto.randomUUID();
			const createdAt = new Date().toISOString();
			db.prepare(
				`
          INSERT INTO companies (id, name, slug, created_at)
          VALUES (?, ?, ?, ?)
        `,
			).run(
				companyId,
				nextInput.companyName,
				nextInput.companySlug,
				createdAt,
			);

			const user = createCompanyUser(companyId, {
				username: nextInput.adminUsername,
				displayName: nextInput.adminDisplayName,
				password: nextInput.password,
				role: "approver",
			});

			db.prepare(
				`
          INSERT INTO company_settings (company_id, localization_settings_json, updated_at)
          VALUES (?, ?, ?)
        `,
			).run(
				companyId,
				JSON.stringify({ enabledLocales: [DEFAULT_LOCALE] }),
				createdAt,
			);

			return {
				company: {
					id: companyId,
					name: nextInput.companyName,
					slug: nextInput.companySlug,
					createdAt,
				},
				user,
			};
		},
	);

	return createInTransaction(input);
}

export function createCompanyUser(
	companyId: string,
	input: CreateCompanyUserInput,
): CompanyUser {
	const company = getCompanyById(companyId);
	if (!company) {
		throw new Error("Company not found");
	}

	const existingUser = getUserByUsername(companyId, input.username);
	if (existingUser) {
		throw new Error("Username is already in use for this company");
	}

	const { hash, salt } = hashPassword(input.password);
	const createdAt = new Date().toISOString();
	const userId = crypto.randomUUID();

	db.prepare(
		`
      INSERT INTO users (
        id,
        company_id,
        username,
        password_hash,
        password_salt,
        display_name,
        role,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
	).run(
		userId,
		companyId,
		input.username,
		hash,
		salt,
		input.displayName,
		input.role,
		createdAt,
	);

	return {
		id: userId,
		companyId,
		username: input.username,
		displayName: input.displayName,
		role: input.role,
		createdAt,
	};
}

export function listCompanyUsers(companyId: string): CompanyUser[] {
	const rows = db
		.prepare(
			`
        SELECT *
        FROM users
        WHERE company_id = ?
        ORDER BY created_at ASC
      `,
		)
		.all(companyId) as UserRow[];
	return rows.map(mapCompanyUser);
}

export function getAll<T>(collection: string, companyId: string): T[] {
	assertCollection(collection);

	if (collection === "models") {
		const rows = db
			.prepare(
				`
          SELECT id, company_id, name, slug, description, fields_json, created_at, updated_at
          FROM content_models
          WHERE company_id = ?
          ORDER BY created_at ASC
        `,
			)
			.all(companyId) as ModelRow[];

		return rows.map((row) => mapModel(row) as unknown as T);
	}

	const rows = db
		.prepare(
			`
        SELECT id, company_id, model_id, values_json, status, current_version_id, created_by, created_at, updated_at
        FROM content_entries
        WHERE company_id = ?
        ORDER BY created_at ASC
      `,
		)
		.all(companyId) as EntryRow[];

	return rows.map((row) => mapEntry(row) as unknown as T);
}

export function getById<T extends { id: string }>(
	collection: string,
	id: string,
	companyId: string,
): T | undefined {
	assertCollection(collection);

	if (collection === "models") {
		const row = db
			.prepare(
				`
          SELECT id, company_id, name, slug, description, fields_json, created_at, updated_at
          FROM content_models
          WHERE id = ? AND company_id = ?
        `,
			)
			.get(id, companyId) as ModelRow | undefined;

		return row ? (mapModel(row) as unknown as T) : undefined;
	}

	const row = db
		.prepare(
			`
        SELECT id, company_id, model_id, values_json, status, current_version_id, created_by, created_at, updated_at
        FROM content_entries
        WHERE id = ? AND company_id = ?
      `,
		)
		.get(id, companyId) as EntryRow | undefined;

	return row ? (mapEntry(row) as unknown as T) : undefined;
}

export function create<T extends { id: string; companyId: string }>(
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

export function update<T extends { id: string; companyId: string }>(
	collection: string,
	id: string,
	updates: Partial<T>,
	companyId: string,
): T | undefined {
	assertCollection(collection);

	const existing = getById<T>(collection, id, companyId);
	if (!existing) {
		return undefined;
	}

	const nextItem = { ...existing, ...updates };

	if (collection === "models") {
		updateModelRecord(nextItem as unknown as ContentModel);
		return getById<T>(collection, id, companyId);
	}

	updateEntryRecord(
		nextItem as unknown as ContentEntry,
		Object.prototype.hasOwnProperty.call(updates, "versions"),
	);
	return getById<T>(collection, id, companyId);
}

export function remove<T extends { id: string }>(
	collection: string,
	id: string,
	companyId: string,
): boolean {
	assertCollection(collection);

	const result =
		collection === "models"
			? db
					.prepare("DELETE FROM content_models WHERE id = ? AND company_id = ?")
					.run(id, companyId)
			: db
					.prepare("DELETE FROM content_entries WHERE id = ? AND company_id = ?")
					.run(id, companyId);

	return result.changes > 0;
}

export function findByField<T>(
	collection: string,
	field: string,
	value: unknown,
	companyId: string,
): T[] {
	assertCollection(collection);

	if (collection === "entries" && field === "modelId") {
		const rows = db
			.prepare(
				`
          SELECT id, company_id, model_id, values_json, status, current_version_id, created_by, created_at, updated_at
          FROM content_entries
          WHERE model_id = ? AND company_id = ?
          ORDER BY created_at ASC
        `,
			)
			.all(String(value), companyId) as EntryRow[];

		return rows.map((row) => mapEntry(row) as unknown as T);
	}

	return getAll<Record<string, unknown>>(collection, companyId).filter(
		(item) => item[field] === value,
	) as T[];
}

export function removeByField<T>(
	collection: string,
	field: string,
	value: unknown,
	companyId: string,
): number {
	assertCollection(collection);

	if (collection === "entries" && field === "modelId") {
		const result = db
			.prepare(
				"DELETE FROM content_entries WHERE model_id = ? AND company_id = ?",
			)
			.run(String(value), companyId);

		return result.changes;
	}

	return 0;
}

export function getLocalizationSettings(companyId: string): LocalizationSettings {
	const row = db
		.prepare(
			`
        SELECT localization_settings_json
        FROM company_settings
        WHERE company_id = ?
      `,
		)
		.get(companyId) as { localization_settings_json: string } | undefined;

	const parsed = row
		? parseJson<{ enabledLocales?: string[] }>(row.localization_settings_json, {})
		: undefined;

	return buildLocalizationSettings(parsed?.enabledLocales);
}

export function getUserByUsername(
	companyId: string,
	username: string,
): UserRow | undefined {
	return db
		.prepare("SELECT * FROM users WHERE company_id = ? AND username = ?")
		.get(companyId, username) as UserRow | undefined;
}

export function getUserById(id: string, companyId?: string): UserRow | undefined {
	if (companyId) {
		return db
			.prepare("SELECT * FROM users WHERE id = ? AND company_id = ?")
			.get(id, companyId) as UserRow | undefined;
	}

	return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as
		| UserRow
		| undefined;
}

export function updateLocalizationSettings(
	companyId: string,
	enabledLocales: string[],
): LocalizationSettings {
	const settings = buildLocalizationSettings(enabledLocales);

	db.prepare(
		`
      INSERT INTO company_settings (company_id, localization_settings_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(company_id) DO UPDATE SET
        localization_settings_json = excluded.localization_settings_json,
        updated_at = excluded.updated_at
    `,
	).run(
		companyId,
		JSON.stringify({
			enabledLocales: settings.enabledLocales,
		}),
		new Date().toISOString(),
	);

	return settings;
}
