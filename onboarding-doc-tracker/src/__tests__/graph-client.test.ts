import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../config', () => ({
  config: {
    processing: {
      retryMaxAttempts: 1,
      retryBaseDelayMs: 10,
      retryMaxDelayMs: 100,
    },
  },
}));

import { AzureCredentials } from '../types';

const testCredentials: AzureCredentials = {
  tenantId: 'test-tenant',
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
};

describe('graph-client', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockTokenResponse(token = 'test-access-token', expiresIn = 3600) {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: token,
        token_type: 'Bearer',
        expires_in: expiresIn,
      }),
    });
  }

  function mockApiResponse(data: unknown, status = 200) {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status,
      json: async () => data,
    });
  }

  describe('graphFetch', () => {
    it('acquires a token and makes an authenticated API call', async () => {
      const { graphFetch, clearTokenCache } = await import('../services/graph-client');
      clearTokenCache();
      mockTokenResponse();
      mockApiResponse({ id: '123', name: 'test-item' });

      const result = await graphFetch('/me/drive', {}, testCredentials);

      expect(result).toEqual({ id: '123', name: 'test-item' });
      expect(mockFetch).toHaveBeenCalledTimes(2);

      const tokenCall = mockFetch.mock.calls[0];
      expect(tokenCall[0]).toContain('login.microsoftonline.com/test-tenant');
      expect(tokenCall[1].method).toBe('POST');

      const apiCall = mockFetch.mock.calls[1];
      expect(apiCall[0]).toBe('https://graph.microsoft.com/v1.0/me/drive');
      expect(apiCall[1].headers.Authorization).toBe('Bearer test-access-token');
    });

    it('caches the token for subsequent calls with same credentials', async () => {
      const { graphFetch, clearTokenCache } = await import('../services/graph-client');
      clearTokenCache();

      mockTokenResponse();
      mockApiResponse({ data: 'first' });
      await graphFetch('/first', {}, testCredentials);

      mockApiResponse({ data: 'second' });
      await graphFetch('/second', {}, testCredentials);

      // 1 token call + 2 API calls = 3 total
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('acquires separate tokens for different credentials', async () => {
      const { graphFetch, clearTokenCache } = await import('../services/graph-client');
      clearTokenCache();

      const otherCredentials: AzureCredentials = {
        tenantId: 'other-tenant',
        clientId: 'other-client',
        clientSecret: 'other-secret',
      };

      mockTokenResponse('token-1');
      mockApiResponse({ data: 'first' });
      await graphFetch('/first', {}, testCredentials);

      mockTokenResponse('token-2');
      mockApiResponse({ data: 'second' });
      await graphFetch('/second', {}, otherCredentials);

      // 2 token calls + 2 API calls = 4 total
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('refreshes the token when it is about to expire', async () => {
      const { graphFetch, clearTokenCache } = await import('../services/graph-client');
      clearTokenCache();
      const dateSpy = vi.spyOn(Date, 'now');

      dateSpy.mockReturnValue(0);
      mockTokenResponse('token-1', 100);
      mockApiResponse({ data: 'first' });
      await graphFetch('/first', {}, testCredentials);

      // After expiry window (100*1000 - 60_000 = 40000ms)
      dateSpy.mockReturnValue(50_000);
      mockTokenResponse('token-2', 3600);
      mockApiResponse({ data: 'second' });
      await graphFetch('/second', {}, testCredentials);

      // 2 token calls + 2 API calls = 4 total
      expect(mockFetch).toHaveBeenCalledTimes(4);
      dateSpy.mockRestore();
    });

    it('throws on token acquisition failure', async () => {
      const { graphFetch, clearTokenCache } = await import('../services/graph-client');
      clearTokenCache();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Invalid client credentials',
      });

      await expect(graphFetch('/test', {}, testCredentials)).rejects.toThrow(
        'Token acquisition failed (401): Invalid client credentials'
      );
    });

    it('throws on API error response', async () => {
      const { graphFetch, clearTokenCache } = await import('../services/graph-client');
      clearTokenCache();

      mockTokenResponse();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Resource not found',
      });

      await expect(graphFetch('/missing', {}, testCredentials)).rejects.toThrow(
        'Graph API error 404 on /missing: Resource not found'
      );
    });

    it('returns undefined for 204 No Content responses', async () => {
      const { graphFetch, clearTokenCache } = await import('../services/graph-client');
      clearTokenCache();

      mockTokenResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const result = await graphFetch('/delete-something', {}, testCredentials);
      expect(result).toBeUndefined();
    });

    it('passes custom options through to fetch', async () => {
      const { graphFetch, clearTokenCache } = await import('../services/graph-client');
      clearTokenCache();

      mockTokenResponse();
      mockApiResponse({ created: true });

      await graphFetch('/items', {
        method: 'POST',
        body: JSON.stringify({ name: 'test' }),
      }, testCredentials);

      const apiCall = mockFetch.mock.calls[1];
      expect(apiCall[1].method).toBe('POST');
      expect(apiCall[1].body).toBe(JSON.stringify({ name: 'test' }));
    });
  });

  describe('graphUpload', () => {
    it('uploads binary content with octet-stream content type', async () => {
      const { graphUpload, clearTokenCache } = await import('../services/graph-client');
      clearTokenCache();

      mockTokenResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'file-123', name: 'uploaded.pdf' }),
      });

      const content = Buffer.from('fake pdf content');
      const result = await graphUpload('/upload/path', content, testCredentials);

      expect(result).toEqual({ id: 'file-123', name: 'uploaded.pdf' });

      const uploadCall = mockFetch.mock.calls[1];
      expect(uploadCall[1].method).toBe('PUT');
      expect(uploadCall[1].headers['Content-Type']).toBe('application/octet-stream');
      expect(uploadCall[1].body).toBe(content);
    });

    it('throws on upload failure', async () => {
      const { graphUpload, clearTokenCache } = await import('../services/graph-client');
      clearTokenCache();

      mockTokenResponse();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 413,
        text: async () => 'File too large',
      });

      const content = Buffer.from('data');
      await expect(graphUpload('/upload', content, testCredentials)).rejects.toThrow(
        'Graph upload error 413 on /upload: File too large'
      );
    });
  });
});
