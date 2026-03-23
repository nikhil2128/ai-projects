import '@testing-library/jest-dom/vitest';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class MockBroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  constructor(name: string) { this.name = name; }
  postMessage() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() { return true; }
}

if (typeof globalThis.BroadcastChannel === 'undefined') {
  (globalThis as any).BroadcastChannel = MockBroadcastChannel;
}

// Polyfill localStorage if not fully available
if (typeof window.localStorage === 'undefined' || !window.localStorage.clear) {
  const store: Record<string, string> = {};
  const localStorage = {
    getItem(key: string): string | null {
      return key in store ? store[key] : null;
    },
    setItem(key: string, value: string): void {
      store[key] = String(value);
    },
    removeItem(key: string): void {
      delete store[key];
    },
    clear(): void {
      for (const key of Object.keys(store)) delete store[key];
    },
    get length(): number {
      return Object.keys(store).length;
    },
    key(index: number): string | null {
      return Object.keys(store)[index] ?? null;
    },
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorage,
    writable: true,
    configurable: true,
  });
}
