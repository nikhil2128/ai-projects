import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

export function useSocket(imageId: string | null) {
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token || !imageId) return;

    const socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      socket.emit('join:image', { imageId });
    });

    socketRef.current = socket;

    return () => {
      socket.emit('leave:image', { imageId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, imageId]);

  const onEvent = useCallback(
    (event: string, handler: (...args: any[]) => void) => {
      const socket = socketRef.current;
      if (socket) {
        socket.on(event, handler);
        return () => {
          socket.off(event, handler);
        };
      }
      return () => {};
    },
    []
  );

  return { socket: socketRef.current, onEvent };
}
