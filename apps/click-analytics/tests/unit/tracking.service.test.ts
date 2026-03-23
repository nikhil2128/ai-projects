import { describe, it, expect, vi, beforeEach } from "vitest";
import { insertClicksBatch } from "../../src/services/tracking";
import { config } from "../../src/config";

const { insertMock, pushBatchToKinesisMock } = vi.hoisted(() => ({
  insertMock: vi.fn(),
  pushBatchToKinesisMock: vi.fn(),
}));

vi.mock("../../src/database/connection", () => ({
  getDbClient: () => ({
    insert: insertMock,
  }),
}));

vi.mock("../../src/pipeline/kinesis", () => ({
  pushBatchToKinesis: pushBatchToKinesisMock,
}));

const events = [
  {
    websiteId: "ws_1",
    sessionId: "sess_1",
    pageUrl: "https://example.com",
    elementTag: "BUTTON",
    elementId: "cta",
    elementClass: "btn",
    elementText: "Start",
    xPos: 20,
    yPos: 40,
    viewportWidth: 1200,
    viewportHeight: 900,
    referrer: "https://google.com",
    userAgent: "Mozilla/5.0",
    ip: "1.1.1.1",
    metadata: { source: "campaign" },
    receivedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("tracking service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (config as any).pipeline.mode = "clickhouse";
  });

  it("returns zero for empty batch", async () => {
    await expect(insertClicksBatch([])).resolves.toBe(0);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("writes to kinesis in kinesis mode", async () => {
    (config as any).pipeline.mode = "kinesis-s3-clickhouse";
    pushBatchToKinesisMock.mockResolvedValueOnce(1);

    await expect(insertClicksBatch(events)).resolves.toBe(1);
    expect(pushBatchToKinesisMock).toHaveBeenCalledWith(events);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("throws when kinesis write is partial", async () => {
    (config as any).pipeline.mode = "kinesis-s3-clickhouse";
    pushBatchToKinesisMock.mockResolvedValueOnce(0);

    await expect(insertClicksBatch(events)).rejects.toThrow("Partial Kinesis write");
  });

  it("writes rows to ClickHouse in clickhouse mode", async () => {
    insertMock.mockResolvedValueOnce(undefined);
    await expect(insertClicksBatch(events)).resolves.toBe(1);

    expect(insertMock).toHaveBeenCalledTimes(1);
    const call = insertMock.mock.calls[0][0];
    expect(call.table).toContain(".click_events");
    expect(call.format).toBe("JSONEachRow");
    expect(call.values[0]).toMatchObject({
      website_id: "ws_1",
      element_id: "cta",
      metadata: "{\"source\":\"campaign\"}",
      event_time: "2026-01-01T00:00:00.000Z",
    });
  });

  it("normalizes optional fields to null", async () => {
    insertMock.mockResolvedValueOnce(undefined);
    await insertClicksBatch([
      {
        ...events[0],
        elementId: undefined,
        elementClass: undefined,
        elementText: undefined,
        referrer: undefined,
        userAgent: undefined,
        metadata: undefined,
      },
    ]);

    const row = insertMock.mock.calls[0][0].values[0];
    expect(row.element_id).toBeNull();
    expect(row.element_class).toBeNull();
    expect(row.element_text).toBeNull();
    expect(row.referrer).toBeNull();
    expect(row.user_agent).toBeNull();
    expect(row.metadata).toBeNull();
  });
});
