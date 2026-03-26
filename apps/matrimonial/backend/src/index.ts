import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profiles.js';
import familyRoutes from './routes/family.js';
import shortlistRoutes from './routes/shortlist.js';
import { store } from './data/store.js';

const app = express();
const PORT = process.env.PORT || 3100;

function msUntilNextRefresh(now: Date = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

function scheduleRecommendationRefresh() {
  const run = () => {
    store.refreshRecommendationsForActiveUsers();
    setTimeout(run, msUntilNextRefresh());
  };

  store.refreshRecommendationsForActiveUsers();
  setTimeout(run, msUntilNextRefresh());
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

scheduleRecommendationRefresh();

app.listen(PORT, () => {
  console.log(`Matrimonial API server running on http://localhost:${PORT}`);
});
