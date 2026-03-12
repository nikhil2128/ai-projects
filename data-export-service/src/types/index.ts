export enum ExportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum PaginationStrategy {
  PAGE = 'page',
  OFFSET = 'offset',
  CURSOR = 'cursor',
}

export interface ExportJob {
  id: string;
  status: ExportStatus;
  apiUrl: string;
  email: string;
  paginationStrategy: PaginationStrategy;
  headers: Record<string, string> | null;
  queryParams: Record<string, string> | null;
  pageSize: number;
  dataPath: string;
  cursorPath: string | null;
  cursorParam: string | null;
  fileName: string | null;
  s3Key: string | null;
  downloadUrl: string | null;
  totalRecords: number;
  pagesProcessed: number;
  errorMessage: string | null;
  attempts: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExportInput {
  apiUrl: string;
  email: string;
  paginationStrategy?: PaginationStrategy;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  pageSize?: number;
  dataPath?: string;
  cursorPath?: string;
  cursorParam?: string;
  fileName?: string;
}

export interface ExportStatusResponse {
  id: string;
  status: ExportStatus;
  totalRecords: number;
  pagesProcessed: number;
  downloadUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}
