import { bootstrap } from './app.js';

bootstrap().catch((error) => {
  console.error('Failed to start Matrimonial API server', error);
  process.exit(1);
});
