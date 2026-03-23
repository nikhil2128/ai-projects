import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';

let uuidCounter = 0;

vi.mock('fs');
vi.mock('uuid', () => ({
  v4: vi.fn(() => `doc-uuid-${++uuidCounter}`),
}));

describe('DocumentStore', () => {
  let documentStore: typeof import('../../store/document-store').documentStore;

  async function createFreshStore() {
    vi.resetModules();
    uuidCounter = 0;

    vi.mock('fs');
    vi.mock('uuid', () => ({
      v4: vi.fn(() => `doc-uuid-${++uuidCounter}`),
    }));

    const freshFs = vi.mocked((await import('fs')).default);
    freshFs.existsSync.mockReturnValue(false);
    freshFs.mkdirSync.mockReturnValue(undefined as any);
    freshFs.writeFileSync.mockReturnValue(undefined);
    freshFs.readFileSync.mockReturnValue('[]');

    const mod = await import('../../store/document-store');
    return { documentStore: mod.documentStore, fs: freshFs };
  }

  beforeEach(async () => {
    const fresh = await createFreshStore();
    documentStore = fresh.documentStore;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('init()', () => {
    it('should create data and ydocs directories if they do not exist', async () => {
      const fresh = await createFreshStore();
      fresh.fs.existsSync.mockReturnValue(false);
      await fresh.documentStore.init();
      expect(fresh.fs.mkdirSync).toHaveBeenCalledTimes(2);
    });

    it('should load existing documents from file', async () => {
      const fresh = await createFreshStore();
      const docs = [
        {
          id: 'doc-1',
          title: 'Test Doc',
          authorId: 'user-1',
          sharedWith: ['user-2'],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ];
      fresh.fs.existsSync
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true);
      fresh.fs.readFileSync.mockReturnValue(JSON.stringify(docs));

      await fresh.documentStore.init();
      const found = fresh.documentStore.getDocument('doc-1');
      expect(found).toBeDefined();
      expect(found!.title).toBe('Test Doc');
    });

    it('should handle docs without authorId or sharedWith', async () => {
      const fresh = await createFreshStore();
      const docs = [
        {
          id: 'doc-1',
          title: 'Old Doc',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ];
      fresh.fs.existsSync
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true);
      fresh.fs.readFileSync.mockReturnValue(JSON.stringify(docs));

      await fresh.documentStore.init();
      const doc = fresh.documentStore.getDocument('doc-1');
      expect(doc).toBeDefined();
      expect(doc!.authorId).toBe('');
      expect(doc!.sharedWith).toEqual([]);
    });

    it('should skip loading when META_FILE does not exist', async () => {
      const fresh = await createFreshStore();
      fresh.fs.existsSync
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      await fresh.documentStore.init();
      expect(fresh.documentStore.listDocuments()).toHaveLength(0);
    });
  });

  describe('createDocument()', () => {
    beforeEach(async () => {
      await documentStore.init();
    });

    it('should create a document with provided title', () => {
      const doc = documentStore.createDocument('My Doc', 'user-1');
      expect(doc.id).toContain('doc-uuid-');
      expect(doc.title).toBe('My Doc');
      expect(doc.authorId).toBe('user-1');
      expect(doc.sharedWith).toEqual([]);
    });

    it('should use default title if empty', () => {
      const doc = documentStore.createDocument('', 'user-1');
      expect(doc.title).toBe('Untitled Document');
    });

    it('should persist after creation', async () => {
      const freshFs = vi.mocked((await import('fs')).default);
      documentStore.createDocument('Test', 'user-1');
      expect(freshFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('documents.json'),
        expect.any(String),
        'utf-8'
      );
    });
  });

  describe('getDocument()', () => {
    let docId: string;
    beforeEach(async () => {
      await documentStore.init();
      const doc = documentStore.createDocument('Doc', 'user-1');
      docId = doc.id;
    });

    it('should return document by id', () => {
      const doc = documentStore.getDocument(docId);
      expect(doc).toBeDefined();
      expect(doc!.title).toBe('Doc');
    });

    it('should return undefined for non-existent id', () => {
      expect(documentStore.getDocument('nope')).toBeUndefined();
    });
  });

  describe('listDocuments()', () => {
    beforeEach(async () => {
      await documentStore.init();
    });

    it('should return documents sorted by updatedAt descending', () => {
      documentStore.createDocument('First', 'user-1');
      documentStore.createDocument('Second', 'user-1');

      const docs = documentStore.listDocuments();
      expect(docs.length).toBe(2);
      expect(new Date(docs[0].updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(docs[1].updatedAt).getTime()
      );
    });
  });

  describe('listDocumentsForUser()', () => {
    beforeEach(async () => {
      await documentStore.init();
      documentStore.createDocument('Alice Doc', 'alice');
      documentStore.createDocument('Bob Doc', 'bob');
      const doc3 = documentStore.createDocument('Shared Doc', 'bob');
      documentStore.shareDocument(doc3.id, 'alice');
    });

    it('should return documents authored by user', () => {
      const docs = documentStore.listDocumentsForUser('alice');
      expect(docs.some((d) => d.title === 'Alice Doc')).toBe(true);
    });

    it('should return documents shared with user', () => {
      const docs = documentStore.listDocumentsForUser('alice');
      expect(docs.some((d) => d.title === 'Shared Doc')).toBe(true);
    });

    it('should not return inaccessible documents', () => {
      const docs = documentStore.listDocumentsForUser('alice');
      expect(docs.some((d) => d.title === 'Bob Doc')).toBe(false);
    });
  });

  describe('canAccess()', () => {
    let docId: string;
    beforeEach(async () => {
      await documentStore.init();
      const doc = documentStore.createDocument('Test', 'author-1');
      docId = doc.id;
      documentStore.shareDocument(docId, 'shared-user');
    });

    it('should return true for author', () => {
      expect(documentStore.canAccess(docId, 'author-1')).toBe(true);
    });

    it('should return true for shared user', () => {
      expect(documentStore.canAccess(docId, 'shared-user')).toBe(true);
    });

    it('should return false for non-authorized user', () => {
      expect(documentStore.canAccess(docId, 'stranger')).toBe(false);
    });

    it('should return false for non-existent document', () => {
      expect(documentStore.canAccess('nonexistent', 'author-1')).toBe(false);
    });
  });

  describe('isAuthor()', () => {
    let docId: string;
    beforeEach(async () => {
      await documentStore.init();
      const doc = documentStore.createDocument('Test', 'author-1');
      docId = doc.id;
    });

    it('should return true for author', () => {
      expect(documentStore.isAuthor(docId, 'author-1')).toBe(true);
    });

    it('should return false for non-author', () => {
      expect(documentStore.isAuthor(docId, 'other-user')).toBe(false);
    });

    it('should return false for non-existent document', () => {
      expect(documentStore.isAuthor('nonexistent', 'author-1')).toBe(false);
    });
  });

  describe('updateDocument()', () => {
    let docId: string;
    beforeEach(async () => {
      await documentStore.init();
      const doc = documentStore.createDocument('Original', 'user-1');
      docId = doc.id;
    });

    it('should update document title', () => {
      const updated = documentStore.updateDocument(docId, { title: 'Updated Title' });
      expect(updated).toBeDefined();
      expect(updated!.title).toBe('Updated Title');
    });

    it('should update the updatedAt timestamp', () => {
      const before = documentStore.getDocument(docId)!.updatedAt;
      const updated = documentStore.updateDocument(docId, { title: 'New' });
      expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(before).getTime()
      );
    });

    it('should return null for non-existent document', () => {
      expect(documentStore.updateDocument('nonexistent', { title: 'x' })).toBeNull();
    });

    it('should not change title if title is undefined', () => {
      const updated = documentStore.updateDocument(docId, {});
      expect(updated!.title).toBe('Original');
    });
  });

  describe('shareDocument()', () => {
    let docId: string;
    beforeEach(async () => {
      await documentStore.init();
      const doc = documentStore.createDocument('Test', 'author-1');
      docId = doc.id;
    });

    it('should add user to sharedWith', () => {
      const doc = documentStore.shareDocument(docId, 'new-user');
      expect(doc!.sharedWith).toContain('new-user');
    });

    it('should not duplicate user in sharedWith', () => {
      documentStore.shareDocument(docId, 'new-user');
      documentStore.shareDocument(docId, 'new-user');
      const doc = documentStore.getDocument(docId);
      expect(doc!.sharedWith.filter((id) => id === 'new-user')).toHaveLength(1);
    });

    it('should return null for non-existent document', () => {
      expect(documentStore.shareDocument('nonexistent', 'user')).toBeNull();
    });
  });

  describe('unshareDocument()', () => {
    let docId: string;
    beforeEach(async () => {
      await documentStore.init();
      const doc = documentStore.createDocument('Test', 'author-1');
      docId = doc.id;
      documentStore.shareDocument(docId, 'shared-user');
    });

    it('should remove user from sharedWith', () => {
      const doc = documentStore.unshareDocument(docId, 'shared-user');
      expect(doc!.sharedWith).not.toContain('shared-user');
    });

    it('should return null for non-existent document', () => {
      expect(documentStore.unshareDocument('nonexistent', 'user')).toBeNull();
    });
  });

  describe('deleteDocument()', () => {
    let docId: string;
    beforeEach(async () => {
      await documentStore.init();
      const doc = documentStore.createDocument('Test', 'author-1');
      docId = doc.id;
    });

    it('should delete existing document', async () => {
      const freshFs = vi.mocked((await import('fs')).default);
      freshFs.existsSync.mockReturnValue(false);
      const result = documentStore.deleteDocument(docId);
      expect(result).toBe(true);
      expect(documentStore.getDocument(docId)).toBeUndefined();
    });

    it('should return false for non-existent document', () => {
      expect(documentStore.deleteDocument('nonexistent')).toBe(false);
    });

    it('should delete ydoc file if it exists', async () => {
      const freshFs = vi.mocked((await import('fs')).default);
      freshFs.existsSync.mockReturnValue(true);
      freshFs.unlinkSync.mockReturnValue(undefined);
      documentStore.deleteDocument(docId);
      expect(freshFs.unlinkSync).toHaveBeenCalledWith(
        expect.stringContaining('.bin')
      );
    });
  });

  describe('getYDocState()', () => {
    beforeEach(async () => {
      await documentStore.init();
    });

    it('should return null if file does not exist', async () => {
      const freshFs = vi.mocked((await import('fs')).default);
      freshFs.existsSync.mockReturnValue(false);
      expect(documentStore.getYDocState('doc-1')).toBeNull();
    });

    it('should return Uint8Array if file exists', async () => {
      const freshFs = vi.mocked((await import('fs')).default);
      freshFs.existsSync.mockReturnValue(true);
      const buf = Buffer.from([1, 2, 3]);
      freshFs.readFileSync.mockReturnValue(buf);

      const result = documentStore.getYDocState('doc-1');
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result![0]).toBe(1);
    });
  });

  describe('saveYDocState()', () => {
    let docId: string;
    beforeEach(async () => {
      await documentStore.init();
      const doc = documentStore.createDocument('Test', 'user-1');
      docId = doc.id;
    });

    it('should write state to file', async () => {
      const freshFs = vi.mocked((await import('fs')).default);
      const state = new Uint8Array([1, 2, 3]);
      documentStore.saveYDocState(docId, state);
      expect(freshFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.bin'),
        expect.any(Buffer)
      );
    });

    it('should update the document updatedAt timestamp', () => {
      const before = documentStore.getDocument(docId)!.updatedAt;
      const state = new Uint8Array([1, 2, 3]);
      documentStore.saveYDocState(docId, state);
      const after = documentStore.getDocument(docId)!.updatedAt;
      expect(new Date(after).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime());
    });

    it('should handle saving state for non-existent document without error', () => {
      const state = new Uint8Array([1, 2, 3]);
      expect(() => documentStore.saveYDocState('nonexistent', state)).not.toThrow();
    });
  });
});
