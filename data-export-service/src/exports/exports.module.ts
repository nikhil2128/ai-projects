import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ExportJob } from './entities/export-job.entity';
import { ExportsController } from './exports.controller';
import { ExportsService, EXPORT_QUEUE_NAME } from './exports.service';
import { ExportsProcessor } from './exports.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExportJob]),
    BullModule.registerQueue({ name: EXPORT_QUEUE_NAME }),
  ],
  controllers: [ExportsController],
  providers: [ExportsService, ExportsProcessor],
  exports: [ExportsService],
})
export class ExportsModule {}
