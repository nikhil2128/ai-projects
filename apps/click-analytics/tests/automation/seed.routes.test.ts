import express from "express";
import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import seedRoutes from "../../src/routes/seed";
import { errorHandler } from "../../src/middleware/errorHandler";

const { seedSampleDataMock } = vi.hoisted(() => ({
  seedSampleDataMock: vi.fn(),
}));

vi.mock("../../src/services/seed", () => ({
  seedSampleData: seedSampleDataMock,
}));

function buildApp() {
  const app = express();
  app.use("/api", seedRoutes);
  app.use(errorHandler);
  return app;
}

describe("seed route automation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedSampleDataMock.mockResolvedValue({ inserted: 42 });
  });

  it("uses default count when query is missing", async () => {
    const app = buildApp();

    const res = await request(app).post("/api/seed");

    expect(res.status).toBe(200);
    expect(seedSampleDataMock).toHaveBeenCalledWith(2000);
    expect(res.body.message).toBe("Seeded 42 sample click events");
  });

  it("caps count to 10000", async () => {
    const app = buildApp();

    await request(app).post("/api/seed?count=200000");

    expect(seedSampleDataMock).toHaveBeenCalledWith(10000);
  });
});
