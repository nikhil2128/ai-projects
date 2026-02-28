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
    vi.spyOn(document, "createElement").mockReturnValue({
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
    } as unknown as HTMLAnchorElement);

    mockElement = document.createElement("div");
  });

  describe("downloadAsPng", () => {
    it("calls toPng and triggers download", async () => {
      const { toPng } = await import("html-to-image");
      await downloadAsPng(mockElement);

      expect(toPng).toHaveBeenCalledWith(mockElement, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        style: { padding: "40px" },
      });
      expect(clickSpy).toHaveBeenCalled();
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
