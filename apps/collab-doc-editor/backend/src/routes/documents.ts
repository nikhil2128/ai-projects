import { Router, Response } from 'express';
import { documentStore } from '../store/document-store';
import { userStore } from '../store/user-store';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const documentsRouter = Router();

documentsRouter.use(authMiddleware);

documentsRouter.get('/', (req: AuthRequest, res: Response) => {
  const docs = documentStore.listDocumentsForUser(req.user!.id);
  res.json(docs);
});

documentsRouter.get('/:id', (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const doc = documentStore.getDocument(id);
  if (!doc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  if (!documentStore.canAccess(doc.id, req.user!.id)) {
    res.status(403).json({ error: 'You do not have access to this document' });
    return;
  }

  const author = userStore.findById(doc.authorId);
  const sharedUsers = userStore.getUsersByIds(doc.sharedWith);

  res.json({
    ...doc,
    author: author ? { id: author.id, name: author.name, email: author.email } : null,
    sharedWithUsers: sharedUsers.map((u) => ({ id: u.id, name: u.name, email: u.email })),
    isAuthor: doc.authorId === req.user!.id,
  });
});

documentsRouter.post('/', (req: AuthRequest, res: Response) => {
  const { title } = req.body;
  const doc = documentStore.createDocument(title || 'Untitled Document', req.user!.id);
  res.status(201).json(doc);
});

documentsRouter.patch('/:id', (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const doc = documentStore.getDocument(id);
  if (!doc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  if (!documentStore.canAccess(doc.id, req.user!.id)) {
    res.status(403).json({ error: 'You do not have access to this document' });
    return;
  }

  const { title } = req.body;
  const updated = documentStore.updateDocument(id, { title });
  res.json(updated);
});

documentsRouter.delete('/:id', (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const doc = documentStore.getDocument(id);
  if (!doc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  if (!documentStore.isAuthor(doc.id, req.user!.id)) {
    res.status(403).json({ error: 'Only the document author can delete this document' });
    return;
  }

  documentStore.deleteDocument(id);
  res.status(204).send();
});

documentsRouter.post('/:id/share', (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const doc = documentStore.getDocument(id);
  if (!doc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  if (!documentStore.isAuthor(doc.id, req.user!.id)) {
    res.status(403).json({ error: 'Only the document author can share this document' });
    return;
  }

  const { userId } = req.body;
  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  const targetUser = userStore.findById(userId);
  if (!targetUser) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (userId === req.user!.id) {
    res.status(400).json({ error: 'Cannot share document with yourself' });
    return;
  }

  const updated = documentStore.shareDocument(id, userId);
  const sharedUsers = userStore.getUsersByIds(updated!.sharedWith);

  res.json({
    ...updated,
    sharedWithUsers: sharedUsers.map((u) => ({ id: u.id, name: u.name, email: u.email })),
  });
});

documentsRouter.delete('/:id/share/:userId', (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const targetUserId = req.params.userId as string;
  const doc = documentStore.getDocument(id);
  if (!doc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  if (!documentStore.isAuthor(doc.id, req.user!.id)) {
    res.status(403).json({ error: 'Only the document author can manage sharing' });
    return;
  }

  const updated = documentStore.unshareDocument(id, targetUserId);
  const sharedUsers = userStore.getUsersByIds(updated!.sharedWith);

  res.json({
    ...updated,
    sharedWithUsers: sharedUsers.map((u) => ({ id: u.id, name: u.name, email: u.email })),
  });
});
