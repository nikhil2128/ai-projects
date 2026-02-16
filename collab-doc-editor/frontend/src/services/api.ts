export interface DocumentMeta {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

const API_BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  async listDocuments(): Promise<DocumentMeta[]> {
    const res = await fetch(`${API_BASE}/documents`);
    return handleResponse(res);
  },

  async getDocument(id: string): Promise<DocumentMeta> {
    const res = await fetch(`${API_BASE}/documents/${id}`);
    return handleResponse(res);
  },

  async createDocument(title: string): Promise<DocumentMeta> {
    const res = await fetch(`${API_BASE}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    return handleResponse(res);
  },

  async updateDocument(id: string, title: string): Promise<DocumentMeta> {
    const res = await fetch(`${API_BASE}/documents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    return handleResponse(res);
  },

  async deleteDocument(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/documents/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },
};
