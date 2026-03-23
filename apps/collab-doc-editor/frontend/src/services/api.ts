export interface DocumentMeta {
  id: string;
  title: string;
  authorId: string;
  sharedWith: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DocumentDetail extends DocumentMeta {
  author: { id: string; name: string; email: string } | null;
  sharedWithUsers: { id: string; name: string; email: string }[];
  isAuthor: boolean;
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
}

const API_BASE = '/api';
const TOKEN_KEY = 'collab-auth-token';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = '/login';
    throw new Error('Session expired');
  }
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  async listDocuments(): Promise<DocumentMeta[]> {
    const res = await fetch(`${API_BASE}/documents`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getDocument(id: string): Promise<DocumentDetail> {
    const res = await fetch(`${API_BASE}/documents/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createDocument(title: string): Promise<DocumentMeta> {
    const res = await fetch(`${API_BASE}/documents`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title }),
    });
    return handleResponse(res);
  },

  async updateDocument(id: string, title: string): Promise<DocumentMeta> {
    const res = await fetch(`${API_BASE}/documents/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title }),
    });
    return handleResponse(res);
  },

  async deleteDocument(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/documents/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async shareDocument(docId: string, userId: string): Promise<DocumentDetail> {
    const res = await fetch(`${API_BASE}/documents/${docId}/share`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId }),
    });
    return handleResponse(res);
  },

  async unshareDocument(docId: string, userId: string): Promise<DocumentDetail> {
    const res = await fetch(`${API_BASE}/documents/${docId}/share/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async searchUsers(query: string, excludeIds: string[] = []): Promise<UserInfo[]> {
    const params = new URLSearchParams({ q: query });
    if (excludeIds.length) params.set('exclude', excludeIds.join(','));
    const res = await fetch(`${API_BASE}/auth/users/search?${params}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};
