import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { initializeSocket } from './socket';
import authRoutes from './routes/auth';
import imageRoutes from './routes/images';
import annotationRoutes from './routes/annotations';
import commentRoutes from './routes/comments';

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
initializeSocket(httpServer);

// Global middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many requests. Please try again later.' },
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  message: { error: 'Too many requests. Please try again later.' },
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/images', apiLimiter, imageRoutes);
app.use('/api', apiLimiter, annotationRoutes);
app.use('/api', apiLimiter, commentRoutes);

// Error handler
app.use(errorHandler);

// Start server
httpServer.listen(config.port, () => {
  console.log(`🚀 Server running on http://localhost:${config.port}`);
  console.log(`📁 Upload directory: ${config.uploadDir}`);
});

export { app, httpServer };
