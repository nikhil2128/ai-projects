import { useState, useRef, useEffect } from 'react';
import { Users, Edit3, Check } from 'lucide-react';

interface User {
  name: string;
  color: string;
  clientId: number;
}

interface UserPresenceProps {
  connectedUsers: User[];
  currentUser: { name: string; color: string };
  onNameChange: (name: string) => void;
}

export function UserPresence({
  connectedUsers,
  currentUser,
  onNameChange,
}: UserPresenceProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(currentUser.name);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false);
        setEditing(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveName = () => {
    if (nameInput.trim()) {
      onNameChange(nameInput.trim());
    }
    setEditing(false);
  };

  const visibleAvatars = connectedUsers.slice(0, 5);
  const overflow = connectedUsers.length - 5;

  return (
    <div className="user-presence" ref={panelRef}>
      <button
        className="presence-trigger"
        onClick={() => setShowPanel(!showPanel)}
        title={`${connectedUsers.length} user(s) connected`}
      >
        <div className="avatar-stack">
          {visibleAvatars.map((user) => (
            <div
              key={user.clientId}
              className="avatar"
              style={{ backgroundColor: user.color }}
              title={user.name}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
          ))}
          {overflow > 0 && (
            <div className="avatar avatar-overflow">+{overflow}</div>
          )}
        </div>
        <Users size={16} />
        <span className="presence-count">{connectedUsers.length}</span>
      </button>

      {showPanel && (
        <div className="presence-panel">
          <div className="presence-panel-header">
            <Users size={16} />
            <span>Connected Users ({connectedUsers.length})</span>
          </div>

          <div className="presence-panel-self">
            <div className="presence-user">
              <div
                className="avatar small"
                style={{ backgroundColor: currentUser.color }}
              >
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              {editing ? (
                <div className="name-edit">
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') setEditing(false);
                    }}
                    autoFocus
                  />
                  <button onClick={handleSaveName}>
                    <Check size={14} />
                  </button>
                </div>
              ) : (
                <div className="name-display">
                  <span>{currentUser.name}</span>
                  <span className="you-badge">You</span>
                  <button onClick={() => setEditing(true)}>
                    <Edit3 size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="presence-panel-list">
            {connectedUsers
              .filter((u) => u.name !== currentUser.name)
              .map((user) => (
                <div key={user.clientId} className="presence-user">
                  <div
                    className="avatar small"
                    style={{ backgroundColor: user.color }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span>{user.name}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
