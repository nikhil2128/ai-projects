import { InvoiceStatus } from '../enums';

export class InvoiceSearchItemDto {
  id: string;
  originalFilename: string;
  vendorName: string | null;
  amount: number | null;
  tax: number | null;
  dueDate: Date | null;
  status: InvoiceStatus;
  createdAt: Date;
  processedAt: Date | null;
}

export class PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export class SearchInvoicesResponseDto {
  data: InvoiceSearchItemDto[];
  meta: PaginationMeta;
}
