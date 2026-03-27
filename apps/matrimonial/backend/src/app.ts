import path from 'path';
import express from 'express';
import cors from 'cors';
import { schedule, type ScheduledTask } from 'node-cron';
import type { Server } from 'node:http';
import type { NextFunction, Request, Response } from 'express';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profiles.js';
import familyRoutes from './routes/family.js';
import shortlistRoutes from './routes/shortlist.js';
import { store } from './data/store.js';

export interface AppOptions {
  serveStaticDir?: string;
}

export interface BootstrapOptions extends AppOptions {
  port?: number;
}

export function scheduleRecommendationRefresh(): ScheduledTask {
  return schedule('0 0 * * *', async () => {
    try {
      console.log('Running daily recommendation refresh...');
      await store.refreshRecommendationsForActiveUsers();
      console.log('Daily recommendation refresh completed.');
    } catch (error) {
      console.error('Failed to refresh recommendations', error);
    }
  }, { timezone: 'UTC' });
}

export function createApp({ serveStaticDir = process.env.SERVE_STATIC }: AppOptions = {}) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/api/auth', authRoutes);
  app.use('/api/profiles', profileRoutes);
  app.use('/api/family', familyRoutes);
  app.use('/api/shortlist', shortlistRoutes);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  if (serveStaticDir) {
    const resolved = path.resolve(serveStaticDir);
    app.use(express.static(resolved));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(resolved, 'index.html'));
    });
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

export async function bootstrap({
  port = Number(process.env.PORT || 3100),
  serveStaticDir = process.env.SERVE_STATIC,
}: BootstrapOptions = {}): Promise<Server> {
  await store.initialize();
  scheduleRecommendationRefresh();

  const app = createApp({ serveStaticDir });

  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`Matrimonial API server running on http://localhost:${port}`);
      resolve(server);
    });
  });
}
