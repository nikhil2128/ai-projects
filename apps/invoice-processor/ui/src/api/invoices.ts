import type {
  UploadInvoiceResponse,
  InvoiceStatusResponse,
  SearchInvoicesResponse,
  SearchFilters,
} from '../types/invoice';

const API_BASE = '/api/v1';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.text();
    let message: string;
    try {
      const json = JSON.parse(body);
      message = json.message || json.error || response.statusText;
    } catch {
      message = body || response.statusText;
    }
    throw new ApiError(response.status, message);
  }
  return response.json() as Promise<T>;
}

export async function uploadInvoice(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<UploadInvoiceResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as UploadInvoiceResponse);
        } catch {
          reject(new Error('Failed to parse response'));
        }
      } else {
        let message = xhr.statusText;
        try {
          const json = JSON.parse(xhr.responseText);
          message = json.message || json.error || message;
        } catch {
          /* use default */
        }
        reject(new ApiError(xhr.status, message));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

    xhr.open('POST', `${API_BASE}/invoices/upload`);
    xhr.send(formData);
  });
}

export async function getInvoiceStatus(
  id: string,
): Promise<InvoiceStatusResponse> {
  const response = await fetch(`${API_BASE}/invoices/${id}/status`);
  return handleResponse<InvoiceStatusResponse>(response);
}

export async function searchInvoices(
  filters: SearchFilters,
): Promise<SearchInvoicesResponse> {
  const params = new URLSearchParams();

  if (filters.vendorName) params.set('vendorName', filters.vendorName);
  if (filters.amountMin !== undefined)
    params.set('amountMin', String(filters.amountMin));
  if (filters.amountMax !== undefined)
    params.set('amountMax', String(filters.amountMax));
  if (filters.dueDateFrom) params.set('dueDateFrom', filters.dueDateFrom);
  if (filters.dueDateTo) params.set('dueDateTo', filters.dueDateTo);
  params.set('page', String(filters.page));
  params.set('limit', String(filters.limit));
  params.set('sortBy', filters.sortBy);
  params.set('sortOrder', filters.sortOrder);

  const response = await fetch(
    `${API_BASE}/invoices/search?${params.toString()}`,
  );
  return handleResponse<SearchInvoicesResponse>(response);
}

export async function checkHealth(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE}/health`);
  return handleResponse<{ status: string }>(response);
}
