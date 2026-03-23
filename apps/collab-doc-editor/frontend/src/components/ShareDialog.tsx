import { useState, useEffect, useRef } from 'react';
import { X, Search, UserPlus, Trash2, Crown, Users } from 'lucide-react';
import { api, UserInfo } from '../services/api';

interface ShareDialogProps {
  docId: string;
  isAuthor: boolean;
  author: { id: string; name: string; email: string } | null;
  sharedWithUsers: { id: string; name: string; email: string }[];
  onClose: () => void;
  onUpdated: () => void;
}

export function ShareDialog({
  docId,
  isAuthor,
  author,
  sharedWithUsers,
  onClose,
  onUpdated,
}: ShareDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserInfo[]>([]);
  const [searching, setSearching] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const excludeIds = sharedWithUsers.map((u) => u.id);
        const results = await api.searchUsers(searchQuery, excludeIds);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery, sharedWithUsers]);

  const handleShare = async (userId: string) => {
    setSharing(userId);
    try {
      await api.shareDocument(docId, userId);
      setSearchQuery('');
      setSearchResults([]);
      onUpdated();
    } catch (err) {
      console.error('Failed to share:', err);
    } finally {
      setSharing(null);
    }
  };

  const handleRemove = async (userId: string) => {
    setRemoving(userId);
    try {
      await api.unshareDocument(docId, userId);
      onUpdated();
    } catch (err) {
      console.error('Failed to remove user:', err);
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="share-overlay">
      <div className="share-dialog" ref={dialogRef}>
        <div className="share-dialog-header">
          <div className="share-dialog-title">
            <Users size={18} />
            <h2>Share Document</h2>
          </div>
          <button className="btn btn-ghost share-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {isAuthor && (
          <div className="share-search-section">
            <div className="share-search-bar">
              <Search size={16} className="share-search-icon" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            {searchQuery.length >= 2 && (
              <div className="share-search-results">
                {searching ? (
                  <div className="share-search-loading">Searching...</div>
                ) : searchResults.length === 0 ? (
                  <div className="share-search-empty">No users found</div>
                ) : (
                  searchResults.map((u) => (
                    <div key={u.id} className="share-search-result">
                      <div className="share-user-info">
                        <span className="share-user-name">{u.name}</span>
                        <span className="share-user-email">{u.email}</span>
                      </div>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleShare(u.id)}
                        disabled={sharing === u.id}
                      >
                        <UserPlus size={14} />
                        {sharing === u.id ? 'Adding...' : 'Add'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        <div className="share-people-section">
          <h3>People with access</h3>

          {author && (
            <div className="share-person">
              <div className="share-person-avatar" style={{ backgroundColor: '#4f6ef7' }}>
                {author.name.charAt(0).toUpperCase()}
              </div>
              <div className="share-user-info">
                <span className="share-user-name">{author.name}</span>
                <span className="share-user-email">{author.email}</span>
              </div>
              <div className="share-role-badge owner-badge">
                <Crown size={12} />
                Owner
              </div>
            </div>
          )}

          {sharedWithUsers.map((u) => (
            <div key={u.id} className="share-person">
              <div className="share-person-avatar" style={{ backgroundColor: '#4ECDC4' }}>
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div className="share-user-info">
                <span className="share-user-name">{u.name}</span>
                <span className="share-user-email">{u.email}</span>
              </div>
              <div className="share-person-actions">
                <span className="share-role-badge editor-badge">Editor</span>
                {isAuthor && (
                  <button
                    className="share-remove-btn"
                    onClick={() => handleRemove(u.id)}
                    disabled={removing === u.id}
                    title="Remove access"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {sharedWithUsers.length === 0 && (
            <div className="share-empty">
              {isAuthor
                ? 'This document is not shared with anyone yet. Search for users above to share.'
                : 'No other collaborators.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
