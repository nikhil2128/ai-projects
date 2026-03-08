import fs from "fs";
import os from "os";
import path from "path";
import type { Server } from "http";
import type { AddressInfo } from "net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface FieldDefinition {
  id: string;
  name: string;
  slug: string;
  type: string;
  required: boolean;
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
  status: "draft" | "published" | "archived";
  versions: EntryVersion[];
  currentVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "content-cms-test-"));
const dataDir = path.join(tempRoot, "data");
const dbPath = path.join(tempRoot, "content-cms.sqlite");

let server: Server;
let baseUrl = "";

async function request<T>(pathname: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  const json = (await response.json()) as ApiResponse<T>;
  if (!response.ok) {
    throw new Error(json.error || `Request failed: ${response.status}`);
  }

  return json;
}

beforeAll(async () => {
  fs.mkdirSync(dataDir, { recursive: true });

  const legacyModel: ContentModel = {
    id: "legacy-model",
    name: "Pages",
    slug: "pages",
    description: "Legacy migrated model",
    fields: [
      {
        id: "title-field",
        name: "Title",
        slug: "title",
        type: "text",
        required: true,
      },
      {
        id: "body-field",
        name: "Body",
        slug: "body",
        type: "richtext",
        required: false,
      },
    ],
    createdAt: "2026-03-08T00:00:00.000Z",
    updatedAt: "2026-03-08T00:00:00.000Z",
  };

  const legacyEntry: ContentEntry = {
    id: "legacy-entry",
    modelId: legacyModel.id,
    values: {
      title: "Migrated page",
      body: "<p>Existing rich text</p>",
    },
    status: "published",
    versions: [
      {
        id: "legacy-version-1",
        entryId: "legacy-entry",
        versionNumber: 1,
        values: {
          title: "Migrated page",
          body: "<p>Existing rich text</p>",
        },
        createdAt: "2026-03-08T00:00:00.000Z",
      },
    ],
    currentVersionId: "legacy-version-1",
    createdAt: "2026-03-08T00:00:00.000Z",
    updatedAt: "2026-03-08T00:00:00.000Z",
  };

  fs.writeFileSync(
    path.join(dataDir, "models.json"),
    JSON.stringify([legacyModel], null, 2),
  );
  fs.writeFileSync(
    path.join(dataDir, "entries.json"),
    JSON.stringify([legacyEntry], null, 2),
  );

  process.env.CMS_DATA_DIR = dataDir;
  process.env.CMS_DB_PATH = dbPath;

  const { default: app } = await import("./app.ts");
  server = app.listen(0);
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  fs.rmSync(tempRoot, { recursive: true, force: true });
  delete process.env.CMS_DATA_DIR;
  delete process.env.CMS_DB_PATH;
});

describe("content CMS persistence", () => {
  it("migrates legacy JSON records into SQLite on startup", async () => {
    const modelsResponse = await request<ContentModel[]>("/api/models");
    expect(modelsResponse.data).toHaveLength(1);
    expect(modelsResponse.data?.[0]).toMatchObject({
      id: "legacy-model",
      name: "Pages",
    });

    const entriesResponse = await request<ContentEntry[]>(
      "/api/entries/model/legacy-model",
    );
    expect(entriesResponse.data).toHaveLength(1);
    expect(entriesResponse.data?.[0]).toMatchObject({
      id: "legacy-entry",
      currentVersionId: "legacy-version-1",
      status: "published",
    });

    const versionsResponse = await request<EntryVersion[]>(
      "/api/entries/legacy-entry/versions",
    );
    expect(versionsResponse.data).toHaveLength(1);
    expect(versionsResponse.data?.[0]?.versionNumber).toBe(1);
  });

  it("persists long rich-text entry payloads and keeps versions intact", async () => {
    const richTextBody = `<p>${"Long rich text ".repeat(14000)}</p>`;
    expect(richTextBody.length).toBeGreaterThan(200000);

    const createdResponse = await request<ContentEntry>("/api/entries", {
      method: "POST",
      body: JSON.stringify({
        modelId: "legacy-model",
        values: {
          title: "Large article",
          body: richTextBody,
        },
      }),
    });

    expect(createdResponse.data?.values.body).toBe(richTextBody);
    expect((createdResponse.data?.values.body as string).length).toBe(
      richTextBody.length,
    );

    const publishResponse = await request<ContentEntry>(
      `/api/entries/${createdResponse.data?.id}/publish`,
      { method: "PUT" },
    );
    expect(publishResponse.data?.status).toBe("published");
    expect(publishResponse.data?.versions).toHaveLength(1);

    const fetchedResponse = await request<ContentEntry>(
      `/api/entries/${createdResponse.data?.id}`,
    );
    expect(fetchedResponse.data?.values.body).toBe(richTextBody);
    expect(fetchedResponse.data?.currentVersionId).toBe(
      publishResponse.data?.currentVersionId,
    );

    const versionsResponse = await request<EntryVersion[]>(
      `/api/entries/${createdResponse.data?.id}/versions`,
    );
    expect(versionsResponse.data).toHaveLength(1);
    expect(versionsResponse.data?.[0]?.values.body).toBe(richTextBody);
  });
});
