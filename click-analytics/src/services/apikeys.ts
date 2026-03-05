import crypto from "crypto";
import { getDbClient } from "../database/connection";
import { config } from "../config";
import type { Website, CreateWebsiteInput } from "../types";

const db = config.clickhouse.database;

const siteKeyCache = new Map<string, Website>();
const secretKeyCache = new Map<string, Website>();
let lastCacheRefresh = 0;
const CACHE_TTL_MS = 60_000;

function generateKey(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(24).toString("hex")}`;
}

export function generateSiteKey(): string {
  return generateKey("pub");
}

export function generateSecretKey(): string {
  return generateKey("sec");
}

async function loadAllWebsites(): Promise<Website[]> {
  const client = getDbClient();
  const result = await client.query({
    query: `SELECT * FROM ${db}.websites FINAL WHERE is_active = 1`,
    format: "JSONEachRow",
  });
  return (await result.json()) as Website[];
}

export async function refreshCache(): Promise<void> {
  const websites = await loadAllWebsites();
  siteKeyCache.clear();
  secretKeyCache.clear();
  for (const w of websites) {
    siteKeyCache.set(w.site_key, w);
    secretKeyCache.set(w.secret_key, w);
  }
  lastCacheRefresh = Date.now();
}

function isCacheStale(): boolean {
  return Date.now() - lastCacheRefresh > CACHE_TTL_MS;
}

export async function lookupBySiteKey(
  siteKey: string
): Promise<Website | null> {
  if (isCacheStale()) {
    await refreshCache();
  }
  return siteKeyCache.get(siteKey) ?? null;
}

export async function lookupBySecretKey(
  secretKey: string
): Promise<Website | null> {
  if (isCacheStale()) {
    await refreshCache();
  }
  return secretKeyCache.get(secretKey) ?? null;
}

export async function createWebsite(
  input: CreateWebsiteInput
): Promise<Website> {
  const client = getDbClient();
  const id = `ws_${crypto.randomBytes(8).toString("hex")}`;
  const siteKey = generateSiteKey();
  const secretKey = generateSecretKey();
  const now = new Date().toISOString();

  const website: Website = {
    id,
    name: input.name,
    allowed_domains: input.allowedDomains,
    site_key: siteKey,
    secret_key: secretKey,
    owner_email: input.ownerEmail,
    is_active: 1,
    created_at: now,
    updated_at: now,
  };

  await client.insert({
    table: `${db}.websites`,
    values: [website],
    format: "JSONEachRow",
  });

  siteKeyCache.set(siteKey, website);
  secretKeyCache.set(secretKey, website);

  return website;
}

export async function updateAllowedDomains(
  websiteId: string,
  domains: string[]
): Promise<Website | null> {
  const client = getDbClient();
  const now = new Date().toISOString();

  const result = await client.query({
    query: `SELECT * FROM ${db}.websites FINAL WHERE id = {id:String} AND is_active = 1`,
    query_params: { id: websiteId },
    format: "JSONEachRow",
  });
  const rows = (await result.json()) as Website[];
  if (rows.length === 0) return null;

  const existing = rows[0];
  const updated: Website = {
    ...existing,
    allowed_domains: domains,
    updated_at: now,
  };

  await client.insert({
    table: `${db}.websites`,
    values: [updated],
    format: "JSONEachRow",
  });

  siteKeyCache.set(updated.site_key, updated);
  secretKeyCache.set(updated.secret_key, updated);

  return updated;
}

export async function rotateKeys(
  websiteId: string
): Promise<{ siteKey: string; secretKey: string } | null> {
  const client = getDbClient();
  const now = new Date().toISOString();

  const result = await client.query({
    query: `SELECT * FROM ${db}.websites FINAL WHERE id = {id:String} AND is_active = 1`,
    query_params: { id: websiteId },
    format: "JSONEachRow",
  });
  const rows = (await result.json()) as Website[];
  if (rows.length === 0) return null;

  const existing = rows[0];
  siteKeyCache.delete(existing.site_key);
  secretKeyCache.delete(existing.secret_key);

  const newSiteKey = generateSiteKey();
  const newSecretKey = generateSecretKey();

  const updated: Website = {
    ...existing,
    site_key: newSiteKey,
    secret_key: newSecretKey,
    updated_at: now,
  };

  await client.insert({
    table: `${db}.websites`,
    values: [updated],
    format: "JSONEachRow",
  });

  siteKeyCache.set(newSiteKey, updated);
  secretKeyCache.set(newSecretKey, updated);

  return { siteKey: newSiteKey, secretKey: newSecretKey };
}

export async function deactivateWebsite(websiteId: string): Promise<boolean> {
  const client = getDbClient();
  const now = new Date().toISOString();

  const result = await client.query({
    query: `SELECT * FROM ${db}.websites FINAL WHERE id = {id:String} AND is_active = 1`,
    query_params: { id: websiteId },
    format: "JSONEachRow",
  });
  const rows = (await result.json()) as Website[];
  if (rows.length === 0) return false;

  const existing = rows[0];
  siteKeyCache.delete(existing.site_key);
  secretKeyCache.delete(existing.secret_key);

  await client.insert({
    table: `${db}.websites`,
    values: [{ ...existing, is_active: 0, updated_at: now }],
    format: "JSONEachRow",
  });

  return true;
}

export async function listWebsitesByOwner(
  ownerEmail: string
): Promise<Website[]> {
  const client = getDbClient();
  const result = await client.query({
    query: `SELECT * FROM ${db}.websites FINAL WHERE owner_email = {email:String} AND is_active = 1 ORDER BY created_at DESC`,
    query_params: { email: ownerEmail },
    format: "JSONEachRow",
  });
  return (await result.json()) as Website[];
}

export async function getWebsiteById(id: string): Promise<Website | null> {
  const client = getDbClient();
  const result = await client.query({
    query: `SELECT * FROM ${db}.websites FINAL WHERE id = {id:String} AND is_active = 1`,
    query_params: { id },
    format: "JSONEachRow",
  });
  const rows = (await result.json()) as Website[];
  return rows[0] ?? null;
}
