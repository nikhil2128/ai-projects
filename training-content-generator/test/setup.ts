import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

vi.mock("lucide-react", async () => {
  const React = await import("react");
  const makeIcon = (name: string) => {
    const Icon = React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
      (props, ref) =>
        React.createElement("svg", {
          ref,
          "data-icon": name,
          ...props,
        })
    );
    Icon.displayName = name;
    return Icon;
  };

  return {
    AlertCircle: makeIcon("AlertCircle"),
    ArrowLeft: makeIcon("ArrowLeft"),
    BarChart3: makeIcon("BarChart3"),
    BookOpen: makeIcon("BookOpen"),
    Check: makeIcon("Check"),
    CheckCircle2: makeIcon("CheckCircle2"),
    ChevronDown: makeIcon("ChevronDown"),
    ChevronLeft: makeIcon("ChevronLeft"),
    ChevronRight: makeIcon("ChevronRight"),
    ChevronUp: makeIcon("ChevronUp"),
    ClipboardCheck: makeIcon("ClipboardCheck"),
    Clock: makeIcon("Clock"),
    Copy: makeIcon("Copy"),
    Download: makeIcon("Download"),
    ExternalLink: makeIcon("ExternalLink"),
    Hash: makeIcon("Hash"),
    Image: makeIcon("Image"),
    ImageIcon: makeIcon("ImageIcon"),
    Lightbulb: makeIcon("Lightbulb"),
    Loader2: makeIcon("Loader2"),
    Mail: makeIcon("Mail"),
    PartyPopper: makeIcon("PartyPopper"),
    PenLine: makeIcon("PenLine"),
    Pencil: makeIcon("Pencil"),
    Plus: makeIcon("Plus"),
    RefreshCw: makeIcon("RefreshCw"),
    Send: makeIcon("Send"),
    Share2: makeIcon("Share2"),
    Sparkles: makeIcon("Sparkles"),
    Target: makeIcon("Target"),
    Trash2: makeIcon("Trash2"),
    Upload: makeIcon("Upload"),
    Users: makeIcon("Users"),
    X: makeIcon("X"),
    XCircle: makeIcon("XCircle"),
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

Object.defineProperty(globalThis, "crypto", {
  value: {
    ...globalThis.crypto,
    randomUUID: () => "test-uuid",
  },
  configurable: true,
});

Object.defineProperty(globalThis.URL, "createObjectURL", {
  value: () => "blob:preview-url",
  configurable: true,
});

if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

Object.defineProperty(window, "scrollTo", {
  value: () => {},
  writable: true,
});
