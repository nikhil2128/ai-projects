import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from '../../services/api';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function mockJsonResponse(data: any, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem('collab-auth-token');
  });

  afterEach(() => {
    localStorage.removeItem('collab-auth-token');
  });

  describe('listDocuments()', () => {
    it('should fetch documents list', async () => {
      const docs = [{ id: '1', title: 'Doc 1' }];
      mockFetch.mockReturnValue(mockJsonResponse(docs));

      const result = await api.listDocuments();
      expect(result).toEqual(docs);
      expect(mockFetch).toHaveBeenCalledWith('/api/documents', expect.any(Object));
    });

    it('should include auth header when token exists', async () => {
      localStorage.setItem('collab-auth-token', 'my-token');
      mockFetch.mockReturnValue(mockJsonResponse([]));

      await api.listDocuments();
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers['Authorization']).toBe('Bearer my-token');
    });
  });

  describe('getDocument()', () => {
    it('should fetch document by id', async () => {
      const doc = { id: '1', title: 'Test', isAuthor: true };
      mockFetch.mockReturnValue(mockJsonResponse(doc));

      const result = await api.getDocument('1');
      expect(result).toEqual(doc);
      expect(mockFetch.mock.calls[0][0]).toContain('/documents/1');
    });
  });

  describe('createDocument()', () => {
    it('should create a document', async () => {
      const doc = { id: '1', title: 'New Doc' };
      mockFetch.mockReturnValue(mockJsonResponse(doc));

      const result = await api.createDocument('New Doc');
      expect(result).toEqual(doc);
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].method).toBe('POST');
      expect(JSON.parse(callArgs[1].body)).toEqual({ title: 'New Doc' });
    });
  });

  describe('updateDocument()', () => {
    it('should update a document', async () => {
      const doc = { id: '1', title: 'Updated' };
      mockFetch.mockReturnValue(mockJsonResponse(doc));

      const result = await api.updateDocument('1', 'Updated');
      expect(result).toEqual(doc);
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].method).toBe('PATCH');
    });
  });

  describe('deleteDocument()', () => {
    it('should delete a document', async () => {
      mockFetch.mockReturnValue(
        Promise.resolve({ ok: true, status: 204, json: () => Promise.resolve(undefined) })
      );

      await api.deleteDocument('1');
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].method).toBe('DELETE');
    });
  });

  describe('shareDocument()', () => {
    it('should share a document with a user', async () => {
      const result = { id: '1', sharedWith: ['user-2'] };
      mockFetch.mockReturnValue(mockJsonResponse(result));

      const res = await api.shareDocument('1', 'user-2');
      expect(res).toEqual(result);
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].method).toBe('POST');
      expect(JSON.parse(callArgs[1].body)).toEqual({ userId: 'user-2' });
    });
  });

  describe('unshareDocument()', () => {
    it('should unshare a document', async () => {
      const result = { id: '1', sharedWith: [] };
      mockFetch.mockReturnValue(mockJsonResponse(result));

      const res = await api.unshareDocument('1', 'user-2');
      expect(res).toEqual(result);
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].method).toBe('DELETE');
      expect(callArgs[0]).toContain('/share/user-2');
    });
  });

  describe('searchUsers()', () => {
    it('should search users with query', async () => {
      const users = [{ id: '2', name: 'Bob', email: 'bob@test.com' }];
      mockFetch.mockReturnValue(mockJsonResponse(users));

      const result = await api.searchUsers('bob');
      expect(result).toEqual(users);
      expect(mockFetch.mock.calls[0][0]).toContain('q=bob');
    });

    it('should include exclude ids', async () => {
      mockFetch.mockReturnValue(mockJsonResponse([]));

      await api.searchUsers('bob', ['user-1', 'user-3']);
      expect(mockFetch.mock.calls[0][0]).toContain('exclude=');
    });
  });

  describe('error handling', () => {
    it('should handle 401 response', async () => {
      mockFetch.mockReturnValue(
        Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'Unauthorized' }),
        })
      );

      await expect(api.listDocuments()).rejects.toThrow('Session expired');
    });

    it('should throw error for non-ok responses', async () => {
      mockFetch.mockReturnValue(
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Server error' }),
        })
      );

      await expect(api.listDocuments()).rejects.toThrow('Server error');
    });

    it('should handle json parse failure on error response', async () => {
      mockFetch.mockReturnValue(
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.reject(new Error('parse error')),
        })
      );

      await expect(api.listDocuments()).rejects.toThrow('Request failed');
    });
  });
});
