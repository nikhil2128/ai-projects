import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

interface ImageProcessingJobData {
  key: string;
  userId: number;
  action: 'generate-blurhash' | 'moderate' | 'extract-metadata';
}

/**
 * Async image processing jobs — content moderation, metadata
 * extraction, blurhash generation, etc. These run after the
 * upload completes so the user doesn't wait.
 */
@Processor('image-processing')
export class ImageProcessorService extends WorkerHost {
  private readonly logger = new Logger(ImageProcessorService.name);

  async process(job: Job<ImageProcessingJobData>) {
    const { key, action } = job.data;

    switch (action) {
      case 'generate-blurhash':
        this.logger.log(`Generating blurhash for ${key}`);
        break;
      case 'moderate':
        this.logger.log(`Running content moderation on ${key}`);
        break;
      case 'extract-metadata':
        this.logger.log(`Extracting EXIF metadata from ${key}`);
        break;
    }
  }
}
