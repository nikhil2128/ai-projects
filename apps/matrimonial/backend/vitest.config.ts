import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
      },
      include: ['src/middleware/**/*.ts', 'src/routes/**/*.ts', 'src/utils/**/*.ts'],
      exclude: ['src/index.ts'],
    },
  },
});
