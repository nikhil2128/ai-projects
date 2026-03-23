import express from "express";
import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import websitesRoutes from "../../src/routes/websites";
import { errorHandler } from "../../src/middleware/errorHandler";

const {
  createWebsiteMock,
  listWebsitesByOwnerMock,
  getWebsiteByIdMock,
  updateAllowedDomainsMock,
  rotateKeysMock,
  deactivateWebsiteMock,
} = vi.hoisted(() => ({
  createWebsiteMock: vi.fn(),
  listWebsitesByOwnerMock: vi.fn(),
  getWebsiteByIdMock: vi.fn(),
  updateAllowedDomainsMock: vi.fn(),
  rotateKeysMock: vi.fn(),
  deactivateWebsiteMock: vi.fn(),
}));

vi.mock("../../src/middleware/auth", () => ({
  requireAdminKey: (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
    next();
  },
}));

vi.mock("../../src/services/apikeys", () => ({
  createWebsite: createWebsiteMock,
  listWebsitesByOwner: listWebsitesByOwnerMock,
  getWebsiteById: getWebsiteByIdMock,
  updateAllowedDomains: updateAllowedDomainsMock,
  rotateKeys: rotateKeysMock,
  deactivateWebsite: deactivateWebsiteMock,
}));

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/websites", websitesRoutes);
  app.use(errorHandler);
  return app;
}

const website = {
  id: "ws_1",
  name: "Main Site",
  allowed_domains: ["example.com"],
  site_key: "pub_123",
  secret_key: "sec_123",
  owner_email: "owner@example.com",
  created_at: "2026-01-01",
};

describe("website routes automation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates website and maps response fields", async () => {
    createWebsiteMock.mockResolvedValueOnce(website);
    const app = buildApp();

    const res = await request(app).post("/api/websites").send({
      name: "Main Site",
      allowedDomains: ["example.com"],
      ownerEmail: "owner@example.com",
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: "ws_1",
      siteKey: "pub_123",
      secretKey: "sec_123",
      ownerEmail: "owner@example.com",
      allowedDomains: ["example.com"],
    });
  });

  it("returns validation errors for invalid create payload", async () => {
    const app = buildApp();

    const res = await request(app).post("/api/websites").send({
      name: "",
      allowedDomains: [],
      ownerEmail: "bad-email",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("lists websites by owner and enforces ownerEmail query", async () => {
    listWebsitesByOwnerMock.mockResolvedValueOnce([website]);
    const app = buildApp();

    const missing = await request(app).get("/api/websites");
    expect(missing.status).toBe(400);

    const res = await request(app).get("/api/websites?ownerEmail=owner@example.com");
    expect(res.status).toBe(200);
    expect(listWebsitesByOwnerMock).toHaveBeenCalledWith("owner@example.com");
    expect(res.body[0]).not.toHaveProperty("secretKey");
  });

  it("gets a website by id and handles not found", async () => {
    const app = buildApp();

    getWebsiteByIdMock.mockResolvedValueOnce(null);
    const miss = await request(app).get("/api/websites/ws_missing");
    expect(miss.status).toBe(404);

    getWebsiteByIdMock.mockResolvedValueOnce(website);
    const hit = await request(app).get("/api/websites/ws_1");
    expect(hit.status).toBe(200);
    expect(hit.body.secretKey).toBe("sec_123");
  });

  it("updates domains, rotates keys and deactivates websites", async () => {
    const app = buildApp();

    updateAllowedDomainsMock.mockResolvedValueOnce({
      ...website,
      allowed_domains: ["example.com", "*.example.org"],
    });
    rotateKeysMock.mockResolvedValueOnce({ siteKey: "pub_new", secretKey: "sec_new" });
    deactivateWebsiteMock.mockResolvedValueOnce(true);

    const update = await request(app).put("/api/websites/ws_1/domains").send({
      allowedDomains: ["example.com", "*.example.org"],
    });
    expect(update.status).toBe(200);
    expect(update.body.allowedDomains).toEqual(["example.com", "*.example.org"]);

    const rotate = await request(app).post("/api/websites/ws_1/rotate-keys");
    expect(rotate.status).toBe(200);
    expect(rotate.body).toEqual({ siteKey: "pub_new", secretKey: "sec_new" });

    const del = await request(app).delete("/api/websites/ws_1");
    expect(del.status).toBe(200);
    expect(del.body).toEqual({ deleted: true });
  });

  it("returns not-found responses for update, rotate, delete", async () => {
    const app = buildApp();

    updateAllowedDomainsMock.mockResolvedValueOnce(null);
    rotateKeysMock.mockResolvedValueOnce(null);
    deactivateWebsiteMock.mockResolvedValueOnce(false);

    const update = await request(app).put("/api/websites/ws_missing/domains").send({
      allowedDomains: ["example.com"],
    });
    expect(update.status).toBe(404);

    const rotate = await request(app).post("/api/websites/ws_missing/rotate-keys");
    expect(rotate.status).toBe(404);

    const del = await request(app).delete("/api/websites/ws_missing");
    expect(del.status).toBe(404);
  });
});
