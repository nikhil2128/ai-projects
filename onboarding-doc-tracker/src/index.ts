import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { config } from './config';
import healthRouter from './routes/health';
import triggerRouter from './routes/trigger';

const app = express();

app.use(cors());
app.use(compression());
app.use(express.json());

app.use(healthRouter);
app.use(triggerRouter);

app.listen(config.port, () => {
  console.warn(`Onboarding Doc Tracker running on port ${config.port}`);
  console.warn(`Health: http://localhost:${config.port}/health`);
  console.warn(`Manual trigger: POST http://localhost:${config.port}/trigger`);
});

export default app;
