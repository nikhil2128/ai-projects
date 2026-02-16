import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, DocumentMeta } from '../services/api';
import { useCollaboration } from '../hooks/useCollaboration';
import { CollaborativeEditor } from '../components/CollaborativeEditor';
import { UserPresence } from '../components/UserPresence';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { ArrowLeft, FileEdit } from 'lucide-react';

export function EditorPage() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const [docMeta, setDocMeta] = useState<DocumentMeta | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');

  const collab = useCollaboration(docId);

  useEffect(() => {
    if (!docId) return;
    api.getDocument(docId).then(setDocMeta).catch(() => navigate('/'));
  }, [docId, navigate]);

  const handleTitleSave = useCallback(async () => {
    if (!docId || !titleValue.trim()) return;
    setEditingTitle(false);
    try {
      const updated = await api.updateDocument(docId, titleValue.trim());
      setDocMeta(updated);
    } catch (err) {
      console.error('Failed to update title:', err);
    }
  }, [docId, titleValue]);

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    }
    if (e.key === 'Escape') {
      setEditingTitle(false);
      setTitleValue(docMeta?.title || '');
    }
  };

  if (!docMeta) {
    return (
      <div className="loading-state page-loading">
        <div className="spinner" />
        <p>Loading document...</p>
      </div>
    );
  }

  return (
    <div className="editor-page">
      <header className="editor-header">
        <div className="editor-header-left">
          <button className="btn btn-ghost" onClick={() => navigate('/')}>
            <ArrowLeft size={18} />
          </button>
          <FileEdit size={24} className="editor-brand-icon" />
          {editingTitle ? (
            <input
              className="title-input"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              autoFocus
            />
          ) : (
            <h1
              className="editor-doc-title"
              onClick={() => {
                setTitleValue(docMeta.title);
                setEditingTitle(true);
              }}
              title="Click to rename"
            >
              {docMeta.title}
            </h1>
          )}
        </div>
        <div className="editor-header-right">
          <ConnectionStatus connected={collab.connected} synced={collab.synced} />
          <UserPresence
            connectedUsers={collab.connectedUsers}
            currentUser={collab.user}
            onNameChange={collab.setUserName}
          />
        </div>
      </header>

      <div className="editor-container">
        <CollaborativeEditor
          ydoc={collab.ydoc}
          provider={collab.provider}
          user={collab.user}
        />
      </div>
    </div>
  );
}
