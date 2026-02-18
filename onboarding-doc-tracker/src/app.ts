import express from 'express';
import cors from 'cors';
import compression from 'compression';
import healthRouter from './routes/health';
import triggerRouter from './routes/trigger';

const app = express();

app.use(cors());
app.use(compression());
app.use(express.json());

app.use(healthRouter);
app.use(triggerRouter);

export default app;
