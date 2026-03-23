export enum InvoiceStatus {
  /** Invoice uploaded, waiting in queue */
  PENDING = 'pending',

  /** Currently being processed by a worker */
  PROCESSING = 'processing',

  /** Successfully extracted all fields */
  COMPLETED = 'completed',

  /** Extraction failed after all retries */
  FAILED = 'failed',
}
