export const ExportStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type ExportStatus = (typeof ExportStatus)[keyof typeof ExportStatus];

export const PaginationStrategy = {
  PAGE: 'page',
  OFFSET: 'offset',
  CURSOR: 'cursor',
} as const;

export type PaginationStrategy =
  (typeof PaginationStrategy)[keyof typeof PaginationStrategy];

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
