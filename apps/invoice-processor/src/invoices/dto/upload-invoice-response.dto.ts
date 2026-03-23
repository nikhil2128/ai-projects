import { InvoiceStatus } from '../enums';

export class UploadInvoiceResponseDto {
  /** Unique invoice ID – use this to poll status */
  id: string;

  /** Original filename */
  originalFilename: string;

  /** Current processing status */
  status: InvoiceStatus;

  /** Timestamp of upload */
  createdAt: Date;

  /** Human-readable message */
  message: string;
}
