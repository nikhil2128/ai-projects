import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FeedFanoutProcessor } from './feed-fanout.processor';
import { ImageProcessorService } from './image-processor.service';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>('REDIS_URL', 'redis://localhost:6379'),
        },
        defaultJobOptions: {
          removeOnComplete: { age: 3600, count: 1000 },
          removeOnFail: { age: 86400, count: 5000 },
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: 'feed-fanout' },
      { name: 'image-processing' },
      { name: 'notifications' },
      { name: 'search-index' },
    ),
  ],
  providers: [FeedFanoutProcessor, ImageProcessorService],
  exports: [BullModule],
})
export class QueueModule {}
