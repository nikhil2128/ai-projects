import { describe, it, expect, vi, beforeEach } from "vitest";
import { seedSampleData } from "../../src/services/seed";

const insertMock = vi.fn();

vi.mock("../../src/database/connection", () => ({
  getDbClient: () => ({
    insert: insertMock,
  }),
}));

describe("seed service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertMock.mockResolvedValue(undefined);
  });

  it("inserts records in 500-row batches", async () => {
    const result = await seedSampleData(1200);

    expect(result).toEqual({ inserted: 1200 });
    expect(insertMock).toHaveBeenCalledTimes(3);
    expect(insertMock.mock.calls[0][0].values).toHaveLength(500);
    expect(insertMock.mock.calls[1][0].values).toHaveLength(500);
    expect(insertMock.mock.calls[2][0].values).toHaveLength(200);
  });

  it("returns zero when event count is zero", async () => {
    const result = await seedSampleData(0);

    expect(result).toEqual({ inserted: 0 });
    expect(insertMock).not.toHaveBeenCalled();
  });
});
