import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api, DocumentMeta } from '../services/api';
import {
  Plus,
  FileText,
  Trash2,
  Clock,
  Search,
  FileEdit,
  LogOut,
  Crown,
  Users,
} from 'lucide-react';

export function HomePage() {
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const loadDocuments = async () => {
    try {
      const docs = await api.listDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const doc = await api.createDocument('Untitled Document');
      navigate(`/doc/${doc.id}`);
    } catch (err) {
      console.error('Failed to create document:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const filtered = documents.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  const isOwner = (doc: DocumentMeta) => doc.authorId === user?.id;

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-header-content">
          <div className="brand">
            <FileEdit size={32} className="brand-icon" />
            <div>
              <h1>CollabDocs</h1>
              <p className="brand-tagline">Real-time collaborative document editing</p>
            </div>
          </div>
          <div className="home-header-user">
            <div className="user-info-chip">
              <div className="user-avatar-sm" style={{ backgroundColor: '#4f6ef7' }}>
                {user?.name.charAt(0).toUpperCase()}
              </div>
              <span className="user-name-text">{user?.name}</span>
            </div>
            <button className="btn btn-ghost" onClick={logout} title="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="home-main">
        <div className="home-actions">
          <div className="search-bar">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={creating}
          >
            <Plus size={18} />
            {creating ? 'Creating...' : 'New Document'}
          </button>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading documents...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <FileText size={64} strokeWidth={1} />
            <h2>{search ? 'No matching documents' : 'No documents yet'}</h2>
            <p>
              {search
                ? 'Try a different search term'
                : 'Create your first collaborative document to get started'}
            </p>
            {!search && (
              <button className="btn btn-primary" onClick={handleCreate}>
                <Plus size={18} />
                Create Document
              </button>
            )}
          </div>
        ) : (
          <div className="document-grid">
            {filtered.map((doc) => (
              <div
                key={doc.id}
                className="document-card"
                onClick={() => navigate(`/doc/${doc.id}`)}
              >
                <div className="document-card-icon">
                  <FileText size={28} />
                </div>
                <div className="document-card-content">
                  <h3 className="document-title">{doc.title}</h3>
                  <div className="document-meta">
                    <Clock size={14} />
                    <span>Edited {formatDate(doc.updatedAt)}</span>
                  </div>
                  <div className="document-badges">
                    {isOwner(doc) ? (
                      <span className="doc-badge owner-badge">
                        <Crown size={11} />
                        Owner
                      </span>
                    ) : (
                      <span className="doc-badge shared-badge">
                        <Users size={11} />
                        Shared
                      </span>
                    )}
                    {doc.sharedWith.length > 0 && isOwner(doc) && (
                      <span className="doc-badge collab-count-badge">
                        <Users size={11} />
                        {doc.sharedWith.length}
                      </span>
                    )}
                  </div>
                </div>
                {isOwner(doc) && (
                  <button
                    className="document-delete"
                    onClick={(e) => handleDelete(e, doc.id)}
                    title="Delete document"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
