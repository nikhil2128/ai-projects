import express from "express";
import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import trackingRoutes from "../../src/routes/tracking";
import { errorHandler } from "../../src/middleware/errorHandler";

const {
  pushToStreamMock,
  pushBatchToStreamMock,
  pushToBufferMock,
  getBufferSizeMock,
} = vi.hoisted(() => ({
  pushToStreamMock: vi.fn(),
  pushBatchToStreamMock: vi.fn(),
  pushToBufferMock: vi.fn(),
  getBufferSizeMock: vi.fn(),
}));

vi.mock("../../src/middleware/auth", () => ({
  requireSiteKey: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.websiteId = "ws_test";
    next();
  },
}));

vi.mock("../../src/queue/producer", () => ({
  pushToStream: pushToStreamMock,
  pushBatchToStream: pushBatchToStreamMock,
}));

vi.mock("../../src/buffer/memory", () => ({
  pushToBuffer: pushToBufferMock,
  getBufferSize: getBufferSizeMock,
}));

function buildPayload() {
  return {
    sessionId: "sess_1",
    pageUrl: "https://example.com/pricing",
    elementTag: "BUTTON",
    elementId: "cta-primary",
    elementClass: "btn-primary",
    elementText: "Buy now",
    xPos: 10,
    yPos: 25,
    viewportWidth: 1200,
    viewportHeight: 900,
    referrer: "https://google.com",
    userAgent: "Mozilla/5.0",
    metadata: { campaign: "spring" },
  };
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", trackingRoutes);
  app.use(errorHandler);
  return app;
}

describe("tracking routes automation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getBufferSizeMock.mockReturnValue(0);
    pushToStreamMock.mockResolvedValue("1-0");
    pushBatchToStreamMock.mockResolvedValue(0);
  });

  it("queues a single tracking event", async () => {
    const app = buildApp();

    const res = await request(app)
      .post("/api/track")
      .set("x-forwarded-for", "10.0.0.1, 10.0.0.2")
      .send(buildPayload());

    expect(res.status).toBe(202);
    expect(res.body.queued).toBe(true);
    expect(res.body.timestamp).toBeTypeOf("string");
    expect(pushToStreamMock).toHaveBeenCalledTimes(1);
    expect(pushToStreamMock.mock.calls[0][0]).toMatchObject({
      websiteId: "ws_test",
      ip: "10.0.0.1",
      pageUrl: "https://example.com/pricing",
    });
    expect(pushToBufferMock).not.toHaveBeenCalled();
  });

  it("falls back to memory buffer when stream enqueue fails", async () => {
    const app = buildApp();
    pushToStreamMock.mockResolvedValueOnce(null);

    const res = await request(app).post("/api/track").send(buildPayload());

    expect(res.status).toBe(202);
    expect(pushToBufferMock).toHaveBeenCalledTimes(1);
    expect(pushToBufferMock.mock.calls[0][0]).toMatchObject({
      websiteId: "ws_test",
    });
  });

  it("returns validation error for invalid tracking body", async () => {
    const app = buildApp();

    const res = await request(app).post("/api/track").send({ sessionId: "" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("queues batch events and buffers only failed items", async () => {
    const app = buildApp();
    const events = [buildPayload(), { ...buildPayload(), sessionId: "sess_2" }];
    pushBatchToStreamMock.mockResolvedValueOnce(1);

    const res = await request(app).post("/api/track/batch").send({ events });

    expect(res.status).toBe(202);
    expect(res.body.queued).toBe(2);
    expect(pushBatchToStreamMock).toHaveBeenCalledTimes(1);
    expect(pushToBufferMock).toHaveBeenCalledTimes(1);
    expect(pushToBufferMock.mock.calls[0][0]).toMatchObject({
      sessionId: "sess_2",
      websiteId: "ws_test",
    });
  });

  it("returns in-memory buffer status", async () => {
    const app = buildApp();
    getBufferSizeMock.mockReturnValueOnce(7);

    const res = await request(app).get("/api/track/status");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ bufferSize: 7 });
  });
});
