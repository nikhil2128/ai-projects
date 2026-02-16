import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface DocumentMeta {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const META_FILE = path.join(DATA_DIR, 'documents.json');
const YDOC_DIR = path.join(DATA_DIR, 'ydocs');

class DocumentStore {
  private documents: Map<string, DocumentMeta> = new Map();

  async init(): Promise<void> {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(YDOC_DIR)) {
      fs.mkdirSync(YDOC_DIR, { recursive: true });
    }

    if (fs.existsSync(META_FILE)) {
      const raw = fs.readFileSync(META_FILE, 'utf-8');
      const docs: DocumentMeta[] = JSON.parse(raw);
      docs.forEach((doc) => this.documents.set(doc.id, doc));
    }
  }

  private persist(): void {
    const docs = Array.from(this.documents.values());
    fs.writeFileSync(META_FILE, JSON.stringify(docs, null, 2), 'utf-8');
  }

  listDocuments(): DocumentMeta[] {
    return Array.from(this.documents.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  getDocument(id: string): DocumentMeta | undefined {
    return this.documents.get(id);
  }

  createDocument(title: string): DocumentMeta {
    const now = new Date().toISOString();
    const doc: DocumentMeta = {
      id: uuidv4(),
      title: title || 'Untitled Document',
      createdAt: now,
      updatedAt: now,
    };
    this.documents.set(doc.id, doc);
    this.persist();
    return doc;
  }

  updateDocument(id: string, updates: Partial<Pick<DocumentMeta, 'title'>>): DocumentMeta | null {
    const doc = this.documents.get(id);
    if (!doc) return null;

    if (updates.title !== undefined) {
      doc.title = updates.title;
    }
    doc.updatedAt = new Date().toISOString();
    this.documents.set(id, doc);
    this.persist();
    return doc;
  }

  deleteDocument(id: string): boolean {
    const existed = this.documents.delete(id);
    if (existed) {
      this.persist();
      const ydocPath = path.join(YDOC_DIR, `${id}.bin`);
      if (fs.existsSync(ydocPath)) {
        fs.unlinkSync(ydocPath);
      }
    }
    return existed;
  }

  getYDocState(docId: string): Uint8Array | null {
    const filePath = path.join(YDOC_DIR, `${docId}.bin`);
    if (!fs.existsSync(filePath)) return null;
    return new Uint8Array(fs.readFileSync(filePath));
  }

  saveYDocState(docId: string, state: Uint8Array): void {
    const filePath = path.join(YDOC_DIR, `${docId}.bin`);
    fs.writeFileSync(filePath, Buffer.from(state));

    const doc = this.documents.get(docId);
    if (doc) {
      doc.updatedAt = new Date().toISOString();
      this.documents.set(docId, doc);
      this.persist();
    }
  }
}

export const documentStore = new DocumentStore();
