import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  login,
  register,
  getMe,
  getImages,
  getImage,
  uploadImage,
  deleteImage,
  getImageFileUrl,
  getThumbnailUrl,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
  createComment,
  deleteComment,
  ApiError,
} from '../../api/client';

// ---------- Setup ----------

const originalFetch = globalThis.fetch;

function mockFetch(data: any, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

function mockFetchError(errorMessage: string, status = 400) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ error: errorMessage }),
  });
}

function mockFetchJsonFail(status = 500) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.reject(new Error('invalid json')),
  });
}

describe('API Client', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // ---------- Request infrastructure ----------

  describe('request helper', () => {
    it('includes Authorization header when token exists', async () => {
      localStorage.setItem('token', 'my-token');
      mockFetch({ user: { id: '1' } });

      await getMe();

      const fetchCall = (globalThis.fetch as any).mock.calls[0];
      expect(fetchCall[1].headers['Authorization']).toBe('Bearer my-token');
    });

    it('does not include Authorization header when no token', async () => {
      mockFetch({ user: { id: '1' } });

      await getMe();

      const fetchCall = (globalThis.fetch as any).mock.calls[0];
      expect(fetchCall[1].headers['Authorization']).toBeUndefined();
    });

    it('sets Content-Type to JSON for JSON bodies', async () => {
      mockFetch({ token: 't', user: { id: '1' } });

      await login('test@test.com', 'password');

      const fetchCall = (globalThis.fetch as any).mock.calls[0];
      expect(fetchCall[1].headers['Content-Type']).toBe('application/json');
    });

    it('does not set Content-Type for FormData bodies', async () => {
      mockFetch({ id: '1', title: 'test' });

      const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
      await uploadImage(file, 'Test');

      const fetchCall = (globalThis.fetch as any).mock.calls[0];
      expect(fetchCall[1].headers['Content-Type']).toBeUndefined();
    });

    it('throws ApiError with status and message on non-OK response', async () => {
      mockFetchError('Invalid credentials', 401);

      await expect(login('bad@test.com', 'wrong')).rejects.toThrow('Invalid credentials');
      await expect(login('bad@test.com', 'wrong')).rejects.toThrow(ApiError);
    });

    it('throws ApiError with "Request failed" when error body has no error field', async () => {
      mockFetchJsonFail(500);

      await expect(getMe()).rejects.toThrow('Request failed');
    });
  });

  // ---------- Auth endpoints ----------

  describe('auth endpoints', () => {
    it('login sends correct request', async () => {
      const mockResponse = { token: 'jwt-123', user: { id: '1', name: 'Test' } };
      mockFetch(mockResponse);

      const result = await login('user@test.com', 'pass123');

      expect(result).toEqual(mockResponse);
      const fetchCall = (globalThis.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toBe('/api/auth/login');
      expect(fetchCall[1].method).toBe('POST');
      expect(JSON.parse(fetchCall[1].body)).toEqual({
        email: 'user@test.com',
        password: 'pass123',
      });
    });

    it('register sends correct request', async () => {
      const mockResponse = { token: 'jwt-456', user: { id: '2', name: 'New User' } };
      mockFetch(mockResponse);

      const result = await register('new@test.com', 'pass123', 'New User', 'ENGINEER', 'QA');

      expect(result).toEqual(mockResponse);
      const fetchCall = (globalThis.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toBe('/api/auth/register');
      expect(JSON.parse(fetchCall[1].body)).toEqual({
        email: 'new@test.com',
        password: 'pass123',
        name: 'New User',
        role: 'ENGINEER',
        department: 'QA',
      });
    });

    it('getMe sends GET to /api/auth/me', async () => {
      const mockUser = { id: '1', name: 'Me', role: 'ENGINEER' };
      mockFetch(mockUser);

      const result = await getMe();

      expect(result).toEqual(mockUser);
      const fetchCall = (globalThis.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toBe('/api/auth/me');
    });
  });

  // ---------- Image endpoints ----------

  describe('image endpoints', () => {
    it('getImages sends correct pagination params', async () => {
      const mockResponse = { images: [], pagination: { page: 2, limit: 10, total: 50, totalPages: 5 } };
      mockFetch(mockResponse);

      await getImages(2, 10);

      const fetchCall = (globalThis.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toBe('/api/images?page=2&limit=10');
    });

    it('getImages uses default params', async () => {
      mockFetch({ images: [], pagination: {} });

      await getImages();

      const fetchCall = (globalThis.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toBe('/api/images?page=1&limit=20');
    });

    it('getImage fetches by ID', async () => {
      const mockImage = { id: 'img-1', title: 'Test', annotations: [] };
      mockFetch(mockImage);

      const result = await getImage('img-1');

      expect(result).toEqual(mockImage);
      const fetchCall = (globalThis.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toBe('/api/images/img-1');
    });

    it('uploadImage sends FormData with file and metadata', async () => {
      mockFetch({ id: 'img-2', title: 'Upload' });

      const file = new File(['image data'], 'photo.jpg', { type: 'image/jpeg' });
      await uploadImage(file, 'My Photo', 'A description');

      const fetchCall = (globalThis.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toBe('/api/images');
      expect(fetchCall[1].method).toBe('POST');

      const formData = fetchCall[1].body;
      expect(formData).toBeInstanceOf(FormData);
      expect(formData.get('title')).toBe('My Photo');
      expect(formData.get('description')).toBe('A description');
      expect(formData.get('image')).toBeInstanceOf(File);
    });

    it('uploadImage does not include description when not provided', async () => {
      mockFetch({ id: 'img-3' });

      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      await uploadImage(file, 'No Desc');

      const formData = (globalThis.fetch as any).mock.calls[0][1].body;
      expect(formData.get('description')).toBeNull();
    });

    it('deleteImage sends DELETE request', async () => {
      mockFetch({ success: true });

      await deleteImage('img-del');

      const fetchCall = (globalThis.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toBe('/api/images/img-del');
      expect(fetchCall[1].method).toBe('DELETE');
    });

    it('getImageFileUrl returns correct URL with token', () => {
      localStorage.setItem('token', 'file-token');
      expect(getImageFileUrl('img-1')).toBe('/api/images/img-1/file?token=file-token');
    });

    it('getThumbnailUrl returns correct URL with token', () => {
      localStorage.setItem('token', 'thumb-token');
      expect(getThumbnailUrl('img-1')).toBe('/api/images/img-1/thumbnail?token=thumb-token');
    });
  });

  // ---------- Annotation endpoints ----------

  describe('annotation endpoints', () => {
    it('createAnnotation sends POST with annotation data', async () => {
      const mockAnnotation = { id: 'ann-1', shapeType: 'CIRCLE' };
      mockFetch(mockAnnotation);

      const data = {
        shapeType: 'CIRCLE' as const,
        centerX: 50,
        centerY: 50,
        radius: 10,
      };
      const result = await createAnnotation('img-1', data);

      expect(result).toEqual(mockAnnotation);
      const fetchCall = (globalThis.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toBe('/api/images/img-1/annotations');
      expect(fetchCall[1].method).toBe('POST');
      expect(JSON.parse(fetchCall[1].body)).toEqual(data);
    });

    it('createAnnotation with rectangle data', async () => {
      mockFetch({ id: 'ann-2' });

      await createAnnotation('img-1', {
        shapeType: 'RECTANGLE',
        centerX: 35,
        centerY: 30,
        radius: 0,
        shapeData: { x: 20, y: 20, width: 30, height: 20 },
      });

      const body = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body);
      expect(body.shapeType).toBe('RECTANGLE');
      expect(body.shapeData).toEqual({ x: 20, y: 20, width: 30, height: 20 });
    });

    it('updateAnnotation sends PATCH with partial data', async () => {
      mockFetch({ id: 'ann-1', status: 'RESOLVED' });

      await updateAnnotation('ann-1', { status: 'RESOLVED' });

      const fetchCall = (globalThis.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toBe('/api/annotations/ann-1');
      expect(fetchCall[1].method).toBe('PATCH');
      expect(JSON.parse(fetchCall[1].body)).toEqual({ status: 'RESOLVED' });
    });

    it('deleteAnnotation sends DELETE request', async () => {
      mockFetch({ success: true });

      await deleteAnnotation('ann-del');

      const fetchCall = (globalThis.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toBe('/api/annotations/ann-del');
      expect(fetchCall[1].method).toBe('DELETE');
    });
  });

  // ---------- Comment endpoints ----------

  describe('comment endpoints', () => {
    it('createComment sends POST with body', async () => {
      const mockComment = { id: 'c-1', body: 'Nice find!' };
      mockFetch(mockComment);

      const result = await createComment('ann-1', 'Nice find!');

      expect(result).toEqual(mockComment);
      const fetchCall = (globalThis.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toBe('/api/annotations/ann-1/comments');
      expect(fetchCall[1].method).toBe('POST');
      expect(JSON.parse(fetchCall[1].body)).toEqual({ body: 'Nice find!' });
    });

    it('deleteComment sends DELETE request', async () => {
      mockFetch({ success: true });

      await deleteComment('c-del');

      const fetchCall = (globalThis.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toBe('/api/comments/c-del');
      expect(fetchCall[1].method).toBe('DELETE');
    });
  });

  // ---------- ApiError ----------

  describe('ApiError', () => {
    it('has correct name, status, and message', () => {
      const err = new ApiError(404, 'Not found');
      expect(err.name).toBe('ApiError');
      expect(err.status).toBe(404);
      expect(err.message).toBe('Not found');
      expect(err instanceof Error).toBe(true);
    });
  });
});
