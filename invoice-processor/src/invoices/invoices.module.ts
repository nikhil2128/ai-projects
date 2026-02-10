import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Invoice } from './entities/invoice.entity';
import { InvoicesController } from './invoices.controller';
import { InvoicesService, INVOICE_QUEUE_NAME } from './invoices.service';
import { InvoicesProcessor } from './invoices.processor';
import { ExtractionModule } from '../extraction/extraction.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice]),
    BullModule.registerQueue({
      name: INVOICE_QUEUE_NAME,
    }),
    ExtractionModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicesProcessor],
  exports: [InvoicesService],
})
export class InvoicesModule {}
