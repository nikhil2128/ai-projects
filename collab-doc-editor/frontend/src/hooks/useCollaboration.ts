import { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F0B27A', '#82E0AA',
];

function getRandomColor(): string {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

function getStoredUser(): { name: string; color: string } {
  const stored = localStorage.getItem('collab-user');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // fall through
    }
  }
  const user = {
    name: `User ${Math.floor(Math.random() * 1000)}`,
    color: getRandomColor(),
  };
  localStorage.setItem('collab-user', JSON.stringify(user));
  return user;
}

export interface CollaborationState {
  ydoc: Y.Doc;
  provider: WebsocketProvider | null;
  connected: boolean;
  synced: boolean;
  user: { name: string; color: string };
  setUserName: (name: string) => void;
  connectedUsers: Array<{ name: string; color: string; clientId: number }>;
}

export function useCollaboration(docId: string | undefined, token: string | null): CollaborationState {
  const ydocRef = useRef(new Y.Doc());
  const providerRef = useRef<WebsocketProvider | null>(null);
  const [connected, setConnected] = useState(false);
  const [synced, setSynced] = useState(false);
  const [user, setUser] = useState(getStoredUser);
  const [connectedUsers, setConnectedUsers] = useState<
    Array<{ name: string; color: string; clientId: number }>
  >([]);

  const setUserName = useCallback(
    (name: string) => {
      const updated = { ...user, name };
      setUser(updated);
      localStorage.setItem('collab-user', JSON.stringify(updated));

      if (providerRef.current) {
        providerRef.current.awareness.setLocalStateField('user', {
          name: updated.name,
          color: updated.color,
        });
      }
    },
    [user]
  );

  useEffect(() => {
    if (!docId || !token) return;

    const ydoc = ydocRef.current;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/collaboration`;

    const provider = new WebsocketProvider(wsUrl, docId, ydoc, {
      connect: true,
      params: { token },
    });

    providerRef.current = provider;

    provider.awareness.setLocalStateField('user', {
      name: user.name,
      color: user.color,
    });

    const updateUsers = () => {
      const states = provider.awareness.getStates();
      const users: Array<{ name: string; color: string; clientId: number }> = [];
      states.forEach((state, clientId) => {
        if (state.user) {
          users.push({
            name: state.user.name,
            color: state.user.color,
            clientId,
          });
        }
      });
      setConnectedUsers(users);
    };

    provider.on('status', ({ status }: { status: string }) => {
      setConnected(status === 'connected');
    });

    provider.on('sync', (isSynced: boolean) => {
      setSynced(isSynced);
    });

    provider.awareness.on('change', updateUsers);

    return () => {
      provider.awareness.off('change', updateUsers);
      provider.disconnect();
      provider.destroy();
      providerRef.current = null;
    };
  }, [docId, token]);

  return {
    ydoc: ydocRef.current,
    provider: providerRef.current,
    connected,
    synced,
    user,
    setUserName,
    connectedUsers,
  };
}
