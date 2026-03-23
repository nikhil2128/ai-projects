import { searchTopicImages } from "../../../server/services/imageSearch";

describe("imageSearch", () => {
  const originalAccessKey = process.env.UNSPLASH_ACCESS_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.UNSPLASH_ACCESS_KEY;
  });

  afterAll(() => {
    if (originalAccessKey) {
      process.env.UNSPLASH_ACCESS_KEY = originalAccessKey;
    } else {
      delete process.env.UNSPLASH_ACCESS_KEY;
    }
  });

  it("returns an empty result when Unsplash is not configured", async () => {
    await expect(searchTopicImages(["Safety"])).resolves.toEqual({});
  });

  it("deduplicates queries and returns fetched images", async () => {
    process.env.UNSPLASH_ACCESS_KEY = "test-key";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ urls: { regular: "https://images.example.com/safety.jpg" } }],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer,
      } as Response);

    const result = await searchTopicImages(["Safety", "Safety"]);

    expect(result).toEqual({
      Safety: "data:image/jpeg;base64,AQID",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("query=Safety");
  });

  it("skips failed lookups and logs unexpected fetch errors", async () => {
    process.env.UNSPLASH_ACCESS_KEY = "test-key";
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: false,
      } as Response)
      .mockRejectedValueOnce(new Error("network down"));

    const result = await searchTopicImages(["Skipped", "Broken"]);

    expect(result).toEqual({});
    expect(errorSpy).toHaveBeenCalledWith(
      'Image search failed for "Broken":',
      expect.any(Error)
    );
  });
});
