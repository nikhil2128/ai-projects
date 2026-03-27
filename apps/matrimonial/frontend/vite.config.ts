import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://localhost:3100',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
      },
      include: [
        'src/App.tsx',
        'src/api.ts',
        'src/context/**/*.tsx',
        'src/components/**/*.tsx',
        'src/pages/Login.tsx',
        'src/pages/Register.tsx',
      ],
      exclude: ['src/components/shared/index.ts'],
    },
  },
});
