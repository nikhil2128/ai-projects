import "@testing-library/jest-dom/vitest";

const memoryStorage = (() => {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => {
      map.clear();
    },
  };
})();

Object.defineProperty(globalThis, "localStorage", {
  value: memoryStorage,
  configurable: true,
});

if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", {
    value: memoryStorage,
    configurable: true,
  });
}
