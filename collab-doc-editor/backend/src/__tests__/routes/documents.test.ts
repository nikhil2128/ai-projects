import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../store/document-store', () => ({
  documentStore: {
    listDocumentsForUser: vi.fn(),
    getDocument: vi.fn(),
    canAccess: vi.fn(),
    isAuthor: vi.fn(),
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
    shareDocument: vi.fn(),
    unshareDocument: vi.fn(),
  },
}));

vi.mock('../../store/user-store', () => ({
  userStore: {
    findById: vi.fn(),
    getUsersByIds: vi.fn(),
  },
}));

vi.mock('../../middleware/auth', () => ({
  authMiddleware: vi.fn((req: any, res: any, next: any) => {
    if (req.headers.authorization === 'Bearer valid-token') {
      req.user = { id: 'user-1', email: 'test@test.com', name: 'Test User' };
      next();
    } else {
      res.status(401).json({ error: 'Authentication required' });
    }
  }),
}));

import { documentsRouter } from '../../routes/documents';
import { documentStore } from '../../store/document-store';
import { userStore } from '../../store/user-store';

const mockedDocStore = vi.mocked(documentStore);
const mockedUserStore = vi.mocked(userStore);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/documents', documentsRouter);
  return app;
}

const AUTH = { Authorization: 'Bearer valid-token' };

const sampleDoc = {
  id: 'doc-1',
  title: 'Test Doc',
  authorId: 'user-1',
  sharedWith: ['user-2'],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
};

describe('Documents Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    app = createApp();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/documents', () => {
    it('should list documents for authenticated user', async () => {
      mockedDocStore.listDocumentsForUser.mockReturnValue([sampleDoc]);

      const res = await request(app).get('/api/documents').set(AUTH);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Test Doc');
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/documents');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/documents/:id', () => {
    it('should return document with author and shared users', async () => {
      mockedDocStore.getDocument.mockReturnValue(sampleDoc);
      mockedDocStore.canAccess.mockReturnValue(true);
      mockedUserStore.findById.mockReturnValue({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test User',
        passwordHash: 'x',
        createdAt: '2024-01-01',
      });
      mockedUserStore.getUsersByIds.mockReturnValue([
        { id: 'user-2', email: 'bob@test.com', name: 'Bob', createdAt: '2024-01-01' },
      ]);

      const res = await request(app).get('/api/documents/doc-1').set(AUTH);

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Test Doc');
      expect(res.body.author).toBeDefined();
      expect(res.body.sharedWithUsers).toHaveLength(1);
      expect(res.body.isAuthor).toBe(true);
    });

    it('should return 404 for non-existent document', async () => {
      mockedDocStore.getDocument.mockReturnValue(undefined);

      const res = await request(app).get('/api/documents/nonexistent').set(AUTH);

      expect(res.status).toBe(404);
    });

    it('should return 403 if user cannot access document', async () => {
      mockedDocStore.getDocument.mockReturnValue({ ...sampleDoc, authorId: 'other-user' });
      mockedDocStore.canAccess.mockReturnValue(false);

      const res = await request(app).get('/api/documents/doc-1').set(AUTH);

      expect(res.status).toBe(403);
    });

    it('should handle document without author', async () => {
      mockedDocStore.getDocument.mockReturnValue(sampleDoc);
      mockedDocStore.canAccess.mockReturnValue(true);
      mockedUserStore.findById.mockReturnValue(undefined);
      mockedUserStore.getUsersByIds.mockReturnValue([]);

      const res = await request(app).get('/api/documents/doc-1').set(AUTH);

      expect(res.status).toBe(200);
      expect(res.body.author).toBeNull();
    });
  });

  describe('POST /api/documents', () => {
    it('should create a new document', async () => {
      mockedDocStore.createDocument.mockReturnValue({
        ...sampleDoc,
        id: 'new-doc',
        sharedWith: [],
      });

      const res = await request(app)
        .post('/api/documents')
        .set(AUTH)
        .send({ title: 'New Document' });

      expect(res.status).toBe(201);
      expect(mockedDocStore.createDocument).toHaveBeenCalledWith('New Document', 'user-1');
    });

    it('should create document with default title', async () => {
      mockedDocStore.createDocument.mockReturnValue({
        ...sampleDoc,
        title: 'Untitled Document',
      });

      const res = await request(app).post('/api/documents').set(AUTH).send({});

      expect(res.status).toBe(201);
      expect(mockedDocStore.createDocument).toHaveBeenCalledWith('Untitled Document', 'user-1');
    });
  });

  describe('PATCH /api/documents/:id', () => {
    it('should update document title', async () => {
      mockedDocStore.getDocument.mockReturnValue(sampleDoc);
      mockedDocStore.canAccess.mockReturnValue(true);
      mockedDocStore.updateDocument.mockReturnValue({ ...sampleDoc, title: 'Updated' });

      const res = await request(app)
        .patch('/api/documents/doc-1')
        .set(AUTH)
        .send({ title: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated');
    });

    it('should return 404 for non-existent document', async () => {
      mockedDocStore.getDocument.mockReturnValue(undefined);

      const res = await request(app)
        .patch('/api/documents/nonexistent')
        .set(AUTH)
        .send({ title: 'x' });

      expect(res.status).toBe(404);
    });

    it('should return 403 if user cannot access document', async () => {
      mockedDocStore.getDocument.mockReturnValue({ ...sampleDoc, authorId: 'other' });
      mockedDocStore.canAccess.mockReturnValue(false);

      const res = await request(app)
        .patch('/api/documents/doc-1')
        .set(AUTH)
        .send({ title: 'x' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/documents/:id', () => {
    it('should delete a document (author only)', async () => {
      mockedDocStore.getDocument.mockReturnValue(sampleDoc);
      mockedDocStore.isAuthor.mockReturnValue(true);
      mockedDocStore.deleteDocument.mockReturnValue(true);

      const res = await request(app).delete('/api/documents/doc-1').set(AUTH);

      expect(res.status).toBe(204);
    });

    it('should return 404 for non-existent document', async () => {
      mockedDocStore.getDocument.mockReturnValue(undefined);

      const res = await request(app).delete('/api/documents/nonexistent').set(AUTH);

      expect(res.status).toBe(404);
    });

    it('should return 403 if not author', async () => {
      mockedDocStore.getDocument.mockReturnValue({ ...sampleDoc, authorId: 'other' });
      mockedDocStore.isAuthor.mockReturnValue(false);

      const res = await request(app).delete('/api/documents/doc-1').set(AUTH);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/documents/:id/share', () => {
    it('should share document with user', async () => {
      mockedDocStore.getDocument.mockReturnValue(sampleDoc);
      mockedDocStore.isAuthor.mockReturnValue(true);
      mockedUserStore.findById.mockReturnValue({
        id: 'user-3',
        email: 'charlie@test.com',
        name: 'Charlie',
        passwordHash: 'x',
        createdAt: '2024-01-01',
      });
      mockedDocStore.shareDocument.mockReturnValue({
        ...sampleDoc,
        sharedWith: ['user-2', 'user-3'],
      });
      mockedUserStore.getUsersByIds.mockReturnValue([
        { id: 'user-2', email: 'bob@test.com', name: 'Bob', createdAt: '2024-01-01' },
        { id: 'user-3', email: 'charlie@test.com', name: 'Charlie', createdAt: '2024-01-01' },
      ]);

      const res = await request(app)
        .post('/api/documents/doc-1/share')
        .set(AUTH)
        .send({ userId: 'user-3' });

      expect(res.status).toBe(200);
      expect(res.body.sharedWithUsers).toHaveLength(2);
    });

    it('should return 404 for non-existent document', async () => {
      mockedDocStore.getDocument.mockReturnValue(undefined);

      const res = await request(app)
        .post('/api/documents/nonexistent/share')
        .set(AUTH)
        .send({ userId: 'user-3' });

      expect(res.status).toBe(404);
    });

    it('should return 403 if not author', async () => {
      mockedDocStore.getDocument.mockReturnValue({ ...sampleDoc, authorId: 'other' });
      mockedDocStore.isAuthor.mockReturnValue(false);

      const res = await request(app)
        .post('/api/documents/doc-1/share')
        .set(AUTH)
        .send({ userId: 'user-3' });

      expect(res.status).toBe(403);
    });

    it('should return 400 if userId not provided', async () => {
      mockedDocStore.getDocument.mockReturnValue(sampleDoc);
      mockedDocStore.isAuthor.mockReturnValue(true);

      const res = await request(app)
        .post('/api/documents/doc-1/share')
        .set(AUTH)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('userId');
    });

    it('should return 404 if target user not found', async () => {
      mockedDocStore.getDocument.mockReturnValue(sampleDoc);
      mockedDocStore.isAuthor.mockReturnValue(true);
      mockedUserStore.findById.mockReturnValue(undefined);

      const res = await request(app)
        .post('/api/documents/doc-1/share')
        .set(AUTH)
        .send({ userId: 'nonexistent' });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('User not found');
    });

    it('should return 400 if sharing with self', async () => {
      mockedDocStore.getDocument.mockReturnValue(sampleDoc);
      mockedDocStore.isAuthor.mockReturnValue(true);
      mockedUserStore.findById.mockReturnValue({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test',
        passwordHash: 'x',
        createdAt: '2024-01-01',
      });

      const res = await request(app)
        .post('/api/documents/doc-1/share')
        .set(AUTH)
        .send({ userId: 'user-1' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('yourself');
    });
  });

  describe('DELETE /api/documents/:id/share/:userId', () => {
    it('should unshare document', async () => {
      mockedDocStore.getDocument.mockReturnValue(sampleDoc);
      mockedDocStore.isAuthor.mockReturnValue(true);
      mockedDocStore.unshareDocument.mockReturnValue({ ...sampleDoc, sharedWith: [] });
      mockedUserStore.getUsersByIds.mockReturnValue([]);

      const res = await request(app)
        .delete('/api/documents/doc-1/share/user-2')
        .set(AUTH);

      expect(res.status).toBe(200);
      expect(res.body.sharedWithUsers).toHaveLength(0);
    });

    it('should return 404 for non-existent document', async () => {
      mockedDocStore.getDocument.mockReturnValue(undefined);

      const res = await request(app)
        .delete('/api/documents/nonexistent/share/user-2')
        .set(AUTH);

      expect(res.status).toBe(404);
    });

    it('should return 403 if not author', async () => {
      mockedDocStore.getDocument.mockReturnValue({ ...sampleDoc, authorId: 'other' });
      mockedDocStore.isAuthor.mockReturnValue(false);

      const res = await request(app)
        .delete('/api/documents/doc-1/share/user-2')
        .set(AUTH);

      expect(res.status).toBe(403);
    });
  });
});
