import { Router, Request, Response } from 'express';
import { documentStore } from '../store/document-store';

export const documentsRouter = Router();

documentsRouter.get('/', (_req: Request, res: Response) => {
  const docs = documentStore.listDocuments();
  res.json(docs);
});

documentsRouter.get('/:id', (req: Request<{ id: string }>, res: Response) => {
  const doc = documentStore.getDocument(req.params.id);
  if (!doc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }
  res.json(doc);
});

documentsRouter.post('/', (req: Request, res: Response) => {
  const { title } = req.body;
  const doc = documentStore.createDocument(title || 'Untitled Document');
  res.status(201).json(doc);
});

documentsRouter.patch('/:id', (req: Request<{ id: string }>, res: Response) => {
  const { title } = req.body;
  const doc = documentStore.updateDocument(req.params.id, { title });
  if (!doc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }
  res.json(doc);
});

documentsRouter.delete('/:id', (req: Request<{ id: string }>, res: Response) => {
  const deleted = documentStore.deleteDocument(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }
  res.status(204).send();
});
