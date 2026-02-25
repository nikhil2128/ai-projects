import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["services/**/*.test.ts", "shared/**/*.test.ts", "tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      provider: "v8",
      include: [
        "services/*/src/service.ts",
        "services/*/src/routes.ts",
        "shared/cache.ts",
        "shared/circuit-breaker.ts",
        "shared/middleware.ts",
      ],
      exclude: [
        "**/*.test.ts",
        "**/node_modules/**",
        "shared/test-db.ts",
        "shared/migrations*.ts",
        "shared/database.ts",
        "shared/graceful-shutdown.ts",
        "services/*/src/index.ts",
        "services/*/src/app.ts",
        "services/*/src/store.ts",
        "gateway/**",
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
