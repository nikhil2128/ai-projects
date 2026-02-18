import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { config } from './config';
import mergeRouter from './routes/merge';

const app = express();

app.use(cors());
app.use(compression());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'video-merger' });
});

// Routes
app.use('/api/merge', mergeRouter);

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`video-merger server running on port ${config.port}`);
});

export default app;
