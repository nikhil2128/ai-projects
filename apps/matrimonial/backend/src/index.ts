import path from 'path';
import express from 'express';
import cors from 'cors';
import { schedule, type ScheduledTask } from 'node-cron';
import type { NextFunction, Request, Response } from 'express';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profiles.js';
import familyRoutes from './routes/family.js';
import shortlistRoutes from './routes/shortlist.js';
import { store } from './data/store.js';

const app = express();
const PORT = process.env.PORT || 3100;

function scheduleRecommendationRefresh(): ScheduledTask {
  return schedule('0 0 * * *', async () => {
    try {
      console.log('Running daily recommendation refresh…');
      await store.refreshRecommendationsForActiveUsers();
      console.log('Daily recommendation refresh completed.');
    } catch (error) {
      console.error('Failed to refresh recommendations', error);
    }
  }, { timezone: 'UTC' });
}

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/shortlist', shortlistRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const staticDir = process.env.SERVE_STATIC;
if (staticDir) {
  const resolved = path.resolve(staticDir);
  app.use(express.static(resolved));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(resolved, 'index.html'));
  });
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

async function bootstrap() {
  await store.initialize();
  scheduleRecommendationRefresh();

  app.listen(PORT, () => {
    console.log(`Matrimonial API server running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start Matrimonial API server', error);
  process.exit(1);
});
