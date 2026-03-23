import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, DocumentDetail } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useCollaboration } from '../hooks/useCollaboration';
import { CollaborativeEditor } from '../components/CollaborativeEditor';
import { UserPresence } from '../components/UserPresence';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { ShareDialog } from '../components/ShareDialog';
import { ArrowLeft, FileEdit, Share2, Lock } from 'lucide-react';

export function EditorPage() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [docMeta, setDocMeta] = useState<DocumentDetail | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const collab = useCollaboration(docId, token);

  const loadDocument = useCallback(() => {
    if (!docId) return;
    api
      .getDocument(docId)
      .then(setDocMeta)
      .catch((err) => {
        if (err.message.includes('403') || err.message.includes('access')) {
          setAccessDenied(true);
        } else {
          navigate('/');
        }
      });
  }, [docId, navigate]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  const handleTitleSave = useCallback(async () => {
    if (!docId || !titleValue.trim()) return;
    setEditingTitle(false);
    try {
      const updated = await api.updateDocument(docId, titleValue.trim());
      setDocMeta((prev) => (prev ? { ...prev, ...updated } : prev));
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

  if (accessDenied) {
    return (
      <div className="access-denied-page">
        <Lock size={48} strokeWidth={1.5} />
        <h2>Access Denied</h2>
        <p>You do not have permission to view this document.</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Go to Dashboard
        </button>
      </div>
    );
  }

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
          <button
            className="btn btn-ghost share-btn"
            onClick={() => setShowShareDialog(true)}
            title="Share document"
          >
            <Share2 size={16} />
            Share
          </button>
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

      {showShareDialog && (
        <ShareDialog
          docId={docMeta.id}
          isAuthor={docMeta.isAuthor}
          author={docMeta.author}
          sharedWithUsers={docMeta.sharedWithUsers}
          onClose={() => setShowShareDialog(false)}
          onUpdated={loadDocument}
        />
      )}
    </div>
  );
}
