export interface ExtractionResult {
  vendorName: string | null;
  amount: number | null;
  tax: number | null;
  dueDate: string | null; // ISO date string YYYY-MM-DD
  confidence: number; // 0 to 1
  rawText: string;
}

export interface ExtractionStrategy {
  /**
   * Extract structured invoice data from a PDF buffer.
   * Implementations may use regex, ML, LLMs, or any other approach.
   */
  extract(pdfBuffer: Buffer): Promise<ExtractionResult>;
}

/** DI token for the extraction strategy */
export const EXTRACTION_STRATEGY = Symbol('EXTRACTION_STRATEGY');
