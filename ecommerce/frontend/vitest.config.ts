import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
    mockReset: true,
    coverage: {
      provider: "v8",
      include: [
        "src/api.ts",
        "src/App.tsx",
        "src/components/**/*.{ts,tsx}",
        "src/pages/**/*.{ts,tsx}",
        "src/hooks/**/*.{ts,tsx}",
        "src/context/**/*.{ts,tsx}",
      ],
      exclude: [
        "src/__tests__/**",
        "src/main.tsx",
        "src/types.ts",
        "src/index.css",
      ],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
      reporter: ["text", "text-summary", "lcov", "json-summary"],
    },
  },
});
