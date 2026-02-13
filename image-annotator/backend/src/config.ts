import path from 'path';

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  uploadDir: path.resolve(process.env.UPLOAD_DIR || './uploads'),
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '20971520', 10), // 20MB
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  bcryptRounds: 12,
  thumbnailWidth: 400,
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg'] as const,
};
