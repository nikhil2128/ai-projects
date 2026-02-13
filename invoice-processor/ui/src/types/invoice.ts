export enum InvoiceStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface UploadInvoiceResponse {
  id: string;
  originalFilename: string;
  status: InvoiceStatus;
  createdAt: string;
  message: string;
}

export interface InvoiceStatusResponse {
  id: string;
  originalFilename: string;
  status: InvoiceStatus;
  attempts: number;
  vendorName: string | null;
  amount: number | null;
  tax: number | null;
  dueDate: string | null;
  confidence: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  processedAt: string | null;
}

export interface InvoiceSearchItem {
  id: string;
  originalFilename: string;
  vendorName: string | null;
  amount: number | null;
  tax: number | null;
  dueDate: string | null;
  status: InvoiceStatus;
  createdAt: string;
  processedAt: string | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface SearchInvoicesResponse {
  data: InvoiceSearchItem[];
  meta: PaginationMeta;
}

export type SortField = 'createdAt' | 'vendorName' | 'amount' | 'dueDate';
export type SortOrder = 'ASC' | 'DESC';

export interface SearchFilters {
  vendorName?: string;
  amountMin?: number;
  amountMax?: number;
  dueDateFrom?: string;
  dueDateTo?: string;
  page: number;
  limit: number;
  sortBy: SortField;
  sortOrder: SortOrder;
}

export interface UploadingFile {
  file: File;
  id: string;
  status: 'uploading' | 'uploaded' | 'error';
  progress: number;
  invoiceId?: string;
  error?: string;
}
