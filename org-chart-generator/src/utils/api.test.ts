import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseOrgChartImage } from "./api";

describe("parseOrgChartImage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends file as FormData and returns parsed response", async () => {
    const mockData = {
      success: true,
      data: { name: "Alice", title: "CEO", children: [] },
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["image-data"], "org.png", { type: "image/png" });
    const result = await parseOrgChartImage(file);

    expect(result).toEqual(mockData);
    expect(fetchMock).toHaveBeenCalledWith("/api/parse", {
      method: "POST",
      body: expect.any(FormData),
    });

    const formData = fetchMock.mock.calls[0][1].body as FormData;
    expect(formData.get("image")).toBe(file);
  });

  it("throws on non-ok response with error message from server", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "AI failed" }),
      }),
    );

    const file = new File(["data"], "org.png", { type: "image/png" });
    await expect(parseOrgChartImage(file)).rejects.toThrow("AI failed");
  });

  it("throws with status code when server returns non-JSON error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: () => Promise.reject(new Error("not json")),
      }),
    );

    const file = new File(["data"], "org.png", { type: "image/png" });
    await expect(parseOrgChartImage(file)).rejects.toThrow(
      "Server error: 502",
    );
  });
});
