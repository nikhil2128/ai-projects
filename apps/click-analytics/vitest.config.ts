import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: [
        "src/middleware/auth.ts",
        "src/middleware/validation.ts",
        "src/middleware/errorHandler.ts",
        "src/routes/**/*.ts",
        "src/services/analytics.ts",
        "src/services/tracking.ts",
        "src/services/seed.ts",
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
});
