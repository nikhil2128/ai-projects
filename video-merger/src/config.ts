import path from 'path';

export const config = {
  port: parseInt(process.env.PORT || '3004', 10),

  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    bucket: process.env.S3_BUCKET || '',
  },

  ffmpeg: {
    ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
    ffprobePath: process.env.FFPROBE_PATH || 'ffprobe',
  },

  processing: {
    maxDurationMinutes: parseInt(process.env.MAX_VIDEO_DURATION_MINUTES || '60', 10),
    tempDir: process.env.TEMP_DIR || path.join('/tmp', 'video-merger'),
  },
} as const;
