import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

const { mockParseOrgChart } = vi.hoisted(() => ({
  mockParseOrgChart: vi.fn(),
}));

vi.mock("./vision.js", () => ({
  parseOrgChart: mockParseOrgChart,
}));

import app from "./app.js";

describe("POST /api/parse", () => {
  beforeEach(() => {
    mockParseOrgChart.mockReset();
  });

  it("returns 400 when no file is uploaded", async () => {
    const res = await request(app).post("/api/parse");
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("No image uploaded");
  });

  it("returns parsed data for valid image upload", async () => {
    const mockData = { name: "Alice", title: "CEO" };
    mockParseOrgChart.mockResolvedValue(mockData);

    const res = await request(app)
      .post("/api/parse")
      .attach("image", Buffer.from("fake-image-data"), {
        filename: "chart.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(mockData);
  });

  it("passes correct base64 and mime type to parseOrgChart", async () => {
    mockParseOrgChart.mockResolvedValue({});

    const imageBuffer = Buffer.from("test-image");
    await request(app)
      .post("/api/parse")
      .attach("image", imageBuffer, {
        filename: "org.jpg",
        contentType: "image/jpeg",
      });

    expect(mockParseOrgChart).toHaveBeenCalledWith(
      imageBuffer.toString("base64"),
      "image/jpeg",
    );
  });

  it("returns 500 when parseOrgChart throws an Error", async () => {
    mockParseOrgChart.mockRejectedValue(new Error("AI is down"));

    const res = await request(app)
      .post("/api/parse")
      .attach("image", Buffer.from("image-data"), {
        filename: "chart.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("AI is down");
  });

  it("returns generic error for non-Error exceptions", async () => {
    mockParseOrgChart.mockRejectedValue("string error");

    const res = await request(app)
      .post("/api/parse")
      .attach("image", Buffer.from("image-data"), {
        filename: "chart.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to parse org chart");
  });

  it("handles large image uploads within limits", async () => {
    mockParseOrgChart.mockResolvedValue({ name: "A", title: "B" });

    const largeImage = Buffer.alloc(1024 * 1024);
    const res = await request(app)
      .post("/api/parse")
      .attach("image", largeImage, {
        filename: "large.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
