import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  requireSiteKey,
  requireSecretKey,
  requireAdminKey,
} from "../../src/middleware/auth";
import { config } from "../../src/config";

const { lookupBySiteKeyMock, lookupBySecretKeyMock } = vi.hoisted(() => ({
  lookupBySiteKeyMock: vi.fn(),
  lookupBySecretKeyMock: vi.fn(),
}));

vi.mock("../../src/services/apikeys", () => ({
  lookupBySiteKey: lookupBySiteKeyMock,
  lookupBySecretKey: lookupBySecretKeyMock,
}));

function createRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as any;
}

async function flushPromises() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

const baseWebsite = {
  id: "ws_1",
  name: "Website",
  allowed_domains: ["example.com", "*.example.org"],
  site_key: "pub_1",
  secret_key: "sec_1",
  owner_email: "owner@example.com",
  is_active: 1,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

describe("auth middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects missing site key", () => {
    const req = { headers: {} } as any;
    const res = createRes();
    const next = vi.fn();

    requireSiteKey(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Missing x-site-key header" });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects invalid site key", async () => {
    lookupBySiteKeyMock.mockResolvedValueOnce(null);
    const req = { headers: { "x-site-key": "bad" } } as any;
    const res = createRes();
    const next = vi.fn();

    requireSiteKey(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid site key" });
  });

  it("rejects missing origin when secret key fallback is not provided", async () => {
    lookupBySiteKeyMock.mockResolvedValueOnce(baseWebsite);
    const req = {
      headers: { "x-site-key": "pub_1" },
    } as any;
    const res = createRes();
    const next = vi.fn();

    requireSiteKey(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("allows server-to-server call with matching x-api-key", async () => {
    lookupBySiteKeyMock.mockResolvedValueOnce(baseWebsite);
    const req = {
      headers: { "x-site-key": "pub_1", "x-api-key": "sec_1" },
    } as any;
    const res = createRes();
    const next = vi.fn();

    requireSiteKey(req, res, next);
    await flushPromises();

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.websiteId).toBe("ws_1");
  });

  it("allows matching origin domain (exact and wildcard)", async () => {
    lookupBySiteKeyMock.mockResolvedValueOnce(baseWebsite);
    const exactReq = {
      headers: { "x-site-key": "pub_1", origin: "https://example.com" },
    } as any;
    const exactRes = createRes();
    const exactNext = vi.fn();

    requireSiteKey(exactReq, exactRes, exactNext);
    await flushPromises();
    expect(exactNext).toHaveBeenCalledTimes(1);

    lookupBySiteKeyMock.mockResolvedValueOnce(baseWebsite);
    const wildcardReq = {
      headers: { "x-site-key": "pub_1", referer: "https://app.example.org/page" },
    } as any;
    const wildcardRes = createRes();
    const wildcardNext = vi.fn();
    requireSiteKey(wildcardReq, wildcardRes, wildcardNext);
    await flushPromises();
    expect(wildcardNext).toHaveBeenCalledTimes(1);
  });

  it("rejects disallowed origin domain", async () => {
    lookupBySiteKeyMock.mockResolvedValueOnce(baseWebsite);
    const req = {
      headers: { "x-site-key": "pub_1", origin: "https://evil.com" },
    } as any;
    const res = createRes();
    const next = vi.fn();

    requireSiteKey(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("forwards lookup errors", async () => {
    const err = new Error("lookup failed");
    lookupBySiteKeyMock.mockRejectedValueOnce(err);
    const req = { headers: { "x-site-key": "pub_1" } } as any;
    const res = createRes();
    const next = vi.fn();

    requireSiteKey(req, res, next);
    await flushPromises();

    expect(next).toHaveBeenCalledWith(err);
  });

  it("validates secret key middleware", async () => {
    const res = createRes();
    const next = vi.fn();

    requireSecretKey({ headers: {} } as any, res, next);
    expect(res.status).toHaveBeenCalledWith(401);

    lookupBySecretKeyMock.mockResolvedValueOnce(null);
    const invalidReq = { headers: { "x-api-key": "bad" } } as any;
    const invalidRes = createRes();
    requireSecretKey(invalidReq, invalidRes, next);
    await flushPromises();
    expect(invalidRes.status).toHaveBeenCalledWith(401);

    lookupBySecretKeyMock.mockResolvedValueOnce(baseWebsite);
    const goodReq = { headers: { "x-api-key": "sec_1" } } as any;
    const goodRes = createRes();
    requireSecretKey(goodReq, goodRes, next);
    await flushPromises();
    expect(next).toHaveBeenCalled();
    expect(goodReq.websiteId).toBe("ws_1");
  });

  it("validates admin key middleware", () => {
    const original = config.adminApiKey;
    (config as any).adminApiKey = "admin-secret";

    const res = createRes();
    const next = vi.fn();
    requireAdminKey({ headers: {} } as any, res, next);
    expect(res.status).toHaveBeenCalledWith(401);

    const okRes = createRes();
    requireAdminKey({ headers: { "x-admin-key": "admin-secret" } } as any, okRes, next);
    expect(next).toHaveBeenCalled();

    (config as any).adminApiKey = original;
  });
});
