import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config';
import { Request } from 'express';
import fs from 'fs';

// Ensure upload directories exist
const originalsDir = path.join(config.uploadDir, 'originals');
const thumbnailsDir = path.join(config.uploadDir, 'thumbnails');

fs.mkdirSync(originalsDir, { recursive: true });
fs.mkdirSync(thumbnailsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    cb(null, originalsDir);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void {
  const allowedTypes: readonly string[] = config.allowedMimeTypes;
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only PNG and JPEG are allowed.`));
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxFileSize,
  },
});
