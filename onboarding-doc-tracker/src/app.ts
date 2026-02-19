import express from 'express';
import cors from 'cors';
import compression from 'compression';
import healthRouter from './routes/health';
import triggerRouter from './routes/trigger';
import tenantsRouter from './routes/tenants';
import { config } from './config';
import {
  securityHeaders,
  apiRateLimiter,
  requestId,
  rejectOversizedBody,
} from './middleware/security';

const app = express();

app.use(requestId);
app.use(securityHeaders);

app.use(
  cors({
    origin: config.security.corsAllowedOrigins.includes('*')
      ? '*'
      : config.security.corsAllowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'x-api-key', 'x-request-id'],
    maxAge: 86400,
  }),
);

app.use(compression());
app.use(rejectOversizedBody);
app.use(express.json({ limit: `${config.security.maxRequestBodyBytes}b` }));
app.use(apiRateLimiter);

app.disable('x-powered-by');

app.use(healthRouter);
app.use(triggerRouter);
app.use(tenantsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;
