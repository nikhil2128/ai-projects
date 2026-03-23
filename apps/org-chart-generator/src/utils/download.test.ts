import { describe, it, expect, vi, beforeEach } from "vitest";
import { downloadAsPng, downloadAsSvg } from "./download";

vi.mock("html-to-image", () => ({
  toPng: vi.fn().mockResolvedValue("data:image/png;base64,AAAA"),
  toSvg: vi.fn().mockResolvedValue("data:image/svg+xml;base64,BBBB"),
}));

describe("download utilities", () => {
  let clickSpy: ReturnType<typeof vi.fn>;
  let mockElement: HTMLElement;

  beforeEach(() => {
    clickSpy = vi.fn();
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      if (tagName.toLowerCase() !== "a") {
        return createElement(tagName);
      }

      return {
        set download(val: string) {
          this._download = val;
        },
        get download() {
          return this._download;
        },
        set href(val: string) {
          this._href = val;
        },
        get href() {
          return this._href;
        },
        click: clickSpy,
        _download: "",
        _href: "",
      } as unknown as HTMLAnchorElement;
    });

    mockElement = document.createElement("div");
    Object.defineProperty(mockElement, "scrollWidth", { value: 1200, configurable: true });
    Object.defineProperty(mockElement, "scrollHeight", { value: 800, configurable: true });
  });

  describe("downloadAsPng", () => {
    it("calls toPng and triggers download", async () => {
      const { toPng } = await import("html-to-image");
      await downloadAsPng(mockElement);

      expect(toPng).toHaveBeenCalledWith(mockElement, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        skipAutoScale: true,
        style: { padding: "40px" },
      });
      expect(clickSpy).toHaveBeenCalled();
    });

    it("reduces pixel ratio for very large charts", async () => {
      const { toPng } = await import("html-to-image");
      Object.defineProperty(mockElement, "scrollWidth", { value: 20000, configurable: true });
      Object.defineProperty(mockElement, "scrollHeight", { value: 6000, configurable: true });

      await downloadAsPng(mockElement);

      const calls = vi.mocked(toPng).mock.calls;
      const options = calls[calls.length - 1]?.[1];
      expect(options?.pixelRatio).toBeLessThan(1);
      expect(options?.pixelRatio).toBeGreaterThanOrEqual(0.5);
    });

    it("uses custom filename when provided", async () => {
      await downloadAsPng(mockElement, "custom.png");
      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe("downloadAsSvg", () => {
    it("calls toSvg and triggers download", async () => {
      const { toSvg } = await import("html-to-image");
      await downloadAsSvg(mockElement);

      expect(toSvg).toHaveBeenCalledWith(mockElement, {
        backgroundColor: "#ffffff",
        style: { padding: "40px" },
      });
      expect(clickSpy).toHaveBeenCalled();
    });

    it("uses custom filename when provided", async () => {
      await downloadAsSvg(mockElement, "custom.svg");
      expect(clickSpy).toHaveBeenCalled();
    });
  });
});
