import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ExtractionResult,
  ExtractionStrategy,
  EXTRACTION_STRATEGY,
} from './interfaces';

/**
 * Facade service that delegates to the configured extraction strategy.
 * This indirection allows the strategy to be swapped at configuration
 * time without changing any consumer code.
 */
@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);

  constructor(
    @Inject(EXTRACTION_STRATEGY)
    private readonly strategy: ExtractionStrategy,
  ) {}

  async extractFromPdf(pdfBuffer: Buffer): Promise<ExtractionResult> {
    this.logger.log('Starting invoice extraction');
    const startTime = Date.now();

    try {
      const result = await this.strategy.extract(pdfBuffer);
      const elapsed = Date.now() - startTime;
      this.logger.log(
        `Extraction completed in ${elapsed}ms – confidence: ${result.confidence}, vendor: ${result.vendorName}`,
      );
      return result;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      this.logger.error(`Extraction failed after ${elapsed}ms: ${error}`);
      throw error;
    }
  }
}
