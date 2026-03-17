export type UserRole = 'writer' | 'reviewer' | 'approver';
export type EntryStatus = 'draft' | 'published' | 'archived';

export interface TenantRecord {
  tenantId: string;
  slug: string;
  companyName: string;
  userPoolId: string;
  userPoolClientId: string;
  tenantRoleArn: string;
  modelsTable: string;
  entriesTable: string;
  versionsTable: string;
  settingsTable: string;
  region: string;
  status: 'provisioning' | 'active' | 'failed';
  adminUsername?: string;
  adminDisplayName?: string;
  adminPasswordSet?: boolean;
  stackName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthContext {
  tenantId: string;
  companyName: string;
  companySlug: string;
  userId: string;
  username: string;
  displayName: string;
  role: UserRole;
  userPoolId: string;
  userPoolClientId: string;
  modelsTable: string;
  entriesTable: string;
  versionsTable: string;
  settingsTable: string;
}

export interface FieldDefinition {
  id: string;
  name: string;
  slug: string;
  type: string;
  required: boolean;
  localizable?: boolean;
  placeholder?: string;
  options?: string[];
}

export interface ContentModel {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  description: string;
  fields: FieldDefinition[];
  createdAt: string;
  updatedAt: string;
}

export interface EntryVersion {
  id: string;
  entryId: string;
  versionNumber: number;
  values: Record<string, unknown>;
  createdAt: string;
}

export interface ContentEntry {
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

export interface LocaleOption {
  code: string;
  label: string;
}

export interface LocalizationSettings {
  defaultLocale: string;
  enabledLocales: string[];
  availableLocales: LocaleOption[];
}

export const AVAILABLE_LOCALE_OPTIONS: LocaleOption[] = [
  { code: 'en-US', label: 'English (United States)' },
  { code: 'en-GB', label: 'English (United Kingdom)' },
  { code: 'es-ES', label: 'Spanish (Spain)' },
  { code: 'fr-FR', label: 'French (France)' },
  { code: 'de-DE', label: 'German (Germany)' },
  { code: 'it-IT', label: 'Italian (Italy)' },
  { code: 'pt-BR', label: 'Portuguese (Brazil)' },
  { code: 'nl-NL', label: 'Dutch (Netherlands)' },
  { code: 'ja-JP', label: 'Japanese (Japan)' },
  { code: 'zh-CN', label: 'Chinese (Simplified)' },
];

export const DEFAULT_LOCALE = 'en-US';
export const VALID_ROLES: UserRole[] = ['writer', 'reviewer', 'approver'];
export const LOCALIZABLE_FIELD_TYPES = new Set(['text', 'textarea', 'richtext']);
