import express from 'express';
import cors from 'cors';
import compression from 'compression';
import healthRouter from './routes/health';
import triggerRouter from './routes/trigger';
import tenantsRouter from './routes/tenants';

const app = express();

app.use(cors());
app.use(compression());
app.use(express.json());

app.use(healthRouter);
app.use(triggerRouter);
app.use(tenantsRouter);

export default app;
