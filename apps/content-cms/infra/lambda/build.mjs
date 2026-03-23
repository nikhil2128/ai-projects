import { build } from 'esbuild';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const handlers = readdirSync('src', { withFileTypes: true })
  .filter(d => d.isDirectory() && d.name !== 'utils')
  .filter(d => statSync(join('src', d.name, 'handler.ts')).isFile())
  .map(d => `src/${d.name}/handler.ts`);

console.log('Building handlers:', handlers);

await build({
  entryPoints: handlers,
  bundle: true,
  platform: 'node',
  target: 'node20',
  outdir: 'dist',
  format: 'esm',
  splitting: false,
  sourcemap: true,
  minify: true,
  external: ['@aws-sdk/*'],
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
  outExtension: { '.js': '.mjs' },
});

console.log('Build complete.');
