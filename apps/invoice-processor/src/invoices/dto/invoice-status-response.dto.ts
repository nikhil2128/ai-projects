import { InvoiceStatus } from '../enums';

export class InvoiceStatusResponseDto {
  id: string;
  originalFilename: string;
  status: InvoiceStatus;
  attempts: number;

  /** Populated when status = COMPLETED */
  vendorName: string | null;
  amount: number | null;
  tax: number | null;
  dueDate: Date | null;
  confidence: number | null;

  /** Populated when status = FAILED */
  errorMessage: string | null;

  createdAt: Date;
  updatedAt: Date;
  processedAt: Date | null;
}
