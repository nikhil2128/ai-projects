import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import { requestLogger, jsonSizeLimit, createRateLimiter } from "./middleware";

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    method: "GET",
    originalUrl: "/test",
    headers: {},
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response {
  const res = {
    statusCode: 200,
    on: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe("requestLogger", () => {
  it("should call next immediately", () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    requestLogger(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("should register a finish listener", () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    requestLogger(req, res, next);
    expect(res.on).toHaveBeenCalledWith("finish", expect.any(Function));
  });

  it("should warn on slow requests", () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    vi.useFakeTimers();
    requestLogger(req, res, next);

    const finishCallback = (res.on as ReturnType<typeof vi.fn>).mock.calls[0][1];

    vi.advanceTimersByTime(1500);
    finishCallback();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("SLOW"));
    warnSpy.mockRestore();
    vi.useRealTimers();
  });

  it("should not warn on fast requests", () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    requestLogger(req, res, next);

    const finishCallback = (res.on as ReturnType<typeof vi.fn>).mock.calls[0][1];
    finishCallback();

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe("jsonSizeLimit", () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it("should pass through when content-length is within limit", () => {
    const req = mockReq({ headers: { "content-length": "500" } as Record<string, string> });
    const res = mockRes();
    const middleware = jsonSizeLimit("1mb");

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("should reject when content-length exceeds 1mb", () => {
    const req = mockReq({ headers: { "content-length": "2000000" } as Record<string, string> });
    const res = mockRes();
    const middleware = jsonSizeLimit("1mb");

    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({ error: "Request payload too large" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should reject when content-length exceeds 10mb", () => {
    const req = mockReq({ headers: { "content-length": "20000000" } as Record<string, string> });
    const res = mockRes();
    const middleware = jsonSizeLimit("10mb");

    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(413);
  });

  it("should pass through when no content-length header", () => {
    const req = mockReq();
    const res = mockRes();
    const middleware = jsonSizeLimit();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("should use 1mb default for unknown limit values", () => {
    const req = mockReq({ headers: { "content-length": "2000000" } as Record<string, string> });
    const res = mockRes();
    const middleware = jsonSizeLimit("5mb");

    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(413);
  });
});

describe("createRateLimiter", () => {
  it("should create a rate limiter middleware", () => {
    const limiter = createRateLimiter(60_000, 100);
    expect(typeof limiter).toBe("function");
  });
});
