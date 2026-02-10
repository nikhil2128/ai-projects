import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import * as fs from 'fs/promises';
import { InvoicesService, INVOICE_QUEUE_NAME } from './invoices.service';
import { ExtractionService } from '../extraction/extraction.service';
import { InvoiceStatus } from './enums';

interface ProcessInvoiceJobData {
  invoiceId: string;
}

/**
 * BullMQ worker that processes invoice extraction jobs.
 *
 * Flow:
 * 1. Load invoice record from DB
 * 2. Read PDF file from disk
 * 3. Run extraction strategy
 * 4. Persist extracted fields back to DB
 * 5. Mark invoice as COMPLETED or FAILED
 */
@Processor(INVOICE_QUEUE_NAME, {
  concurrency: 10,
  limiter: {
    max: 200,
    duration: 60_000, // 200 jobs per minute
  },
})
export class InvoicesProcessor extends WorkerHost {
  private readonly logger = new Logger(InvoicesProcessor.name);

  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly extractionService: ExtractionService,
  ) {
    super();
  }

  async process(job: Job<ProcessInvoiceJobData>): Promise<void> {
    const { invoiceId } = job.data;
    this.logger.log(`Processing invoice ${invoiceId} (attempt ${job.attemptsMade + 1})`);

    // Mark as PROCESSING
    await this.invoicesService.updateInvoice(invoiceId, {
      status: InvoiceStatus.PROCESSING,
      attempts: job.attemptsMade + 1,
    });

    const invoice = await this.invoicesService.findById(invoiceId);
    if (!invoice) {
      this.logger.error(`Invoice ${invoiceId} not found in DB – skipping`);
      return;
    }

    try {
      // Read PDF from disk
      const pdfBuffer = await fs.readFile(invoice.filePath);

      // Run extraction
      const result = await this.extractionService.extractFromPdf(pdfBuffer);

      // Persist results
      await this.invoicesService.updateInvoice(invoiceId, {
        vendorName: result.vendorName,
        amount: result.amount,
        tax: result.tax,
        dueDate: result.dueDate ? new Date(result.dueDate) : null,
        confidence: result.confidence,
        rawText: result.rawText,
        status: InvoiceStatus.COMPLETED,
        processedAt: new Date(),
        errorMessage: null,
      });

      this.logger.log(
        `Invoice ${invoiceId} processed successfully – vendor: ${result.vendorName}, amount: ${result.amount}`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Invoice ${invoiceId} processing failed: ${errorMessage}`);

      // If this was the last attempt, mark as FAILED permanently
      const maxAttempts = (job.opts.attempts ?? 3);
      if (job.attemptsMade + 1 >= maxAttempts) {
        await this.invoicesService.updateInvoice(invoiceId, {
          status: InvoiceStatus.FAILED,
          errorMessage: `Failed after ${job.attemptsMade + 1} attempts. Last error: ${errorMessage}`,
        });
      }

      // Re-throw so BullMQ retries if attempts remain
      throw error;
    }
  }
}
