import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ---------- Mock socket.io-client ----------

const mockSocketInstance = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocketInstance),
}));

// ---------- Mock AuthContext ----------

let mockToken: string | null = 'test-token';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ token: mockToken }),
}));

import { useSocket } from '../../hooks/useSocket';
import { io } from 'socket.io-client';

// ---------- Tests ----------

describe('useSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToken = 'test-token';
    // Reset on/off/emit tracking
    mockSocketInstance.on.mockReset();
    mockSocketInstance.off.mockReset();
    mockSocketInstance.emit.mockReset();
    mockSocketInstance.disconnect.mockReset();
  });

  describe('connection', () => {
    it('connects when both token and imageId are provided', () => {
      renderHook(() => useSocket('image-123'));

      expect(io).toHaveBeenCalledWith('/', {
        auth: { token: 'test-token' },
        transports: ['websocket', 'polling'],
      });
    });

    it('does not connect when token is null', () => {
      mockToken = null;
      renderHook(() => useSocket('image-123'));
      expect(io).not.toHaveBeenCalled();
    });

    it('does not connect when imageId is null', () => {
      renderHook(() => useSocket(null));
      expect(io).not.toHaveBeenCalled();
    });

    it('does not connect when both token and imageId are null', () => {
      mockToken = null;
      renderHook(() => useSocket(null));
      expect(io).not.toHaveBeenCalled();
    });

    it('joins the image room on connect', () => {
      renderHook(() => useSocket('image-456'));

      // Should register a connect handler
      const connectCall = mockSocketInstance.on.mock.calls.find(
        (call) => call[0] === 'connect'
      );
      expect(connectCall).toBeDefined();

      // Simulate the connect event
      connectCall![1]();
      expect(mockSocketInstance.emit).toHaveBeenCalledWith('join:image', {
        imageId: 'image-456',
      });
    });
  });

  describe('cleanup', () => {
    it('leaves image room and disconnects on unmount', () => {
      const { unmount } = renderHook(() => useSocket('image-789'));

      unmount();

      expect(mockSocketInstance.emit).toHaveBeenCalledWith('leave:image', {
        imageId: 'image-789',
      });
      expect(mockSocketInstance.disconnect).toHaveBeenCalled();
    });

    it('does not call disconnect when no connection was made', () => {
      mockToken = null;
      const { unmount } = renderHook(() => useSocket(null));
      unmount();
      expect(mockSocketInstance.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('onEvent', () => {
    it('registers an event handler on the socket', () => {
      const { result } = renderHook(() => useSocket('image-100'));

      const handler = vi.fn();
      act(() => {
        result.current.onEvent('annotation:created', handler);
      });

      expect(mockSocketInstance.on).toHaveBeenCalledWith(
        'annotation:created',
        handler
      );
    });

    it('returns an unsubscribe function that removes the handler', () => {
      const { result } = renderHook(() => useSocket('image-101'));

      const handler = vi.fn();
      let unsub: () => void;

      act(() => {
        unsub = result.current.onEvent('annotation:updated', handler);
      });

      act(() => {
        unsub();
      });

      expect(mockSocketInstance.off).toHaveBeenCalledWith(
        'annotation:updated',
        handler
      );
    });

    it('returns a no-op unsubscribe when socket is not connected', () => {
      mockToken = null;
      const { result } = renderHook(() => useSocket(null));

      const handler = vi.fn();
      let unsub: () => void;

      act(() => {
        unsub = result.current.onEvent('test:event', handler);
      });

      // Should not throw when calling the no-op
      act(() => {
        unsub();
      });

      expect(mockSocketInstance.on).not.toHaveBeenCalledWith('test:event', handler);
    });

    it('can register multiple event handlers', () => {
      const { result } = renderHook(() => useSocket('image-102'));

      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      act(() => {
        result.current.onEvent('annotation:created', handler1);
        result.current.onEvent('annotation:updated', handler2);
        result.current.onEvent('comment:created', handler3);
      });

      expect(mockSocketInstance.on).toHaveBeenCalledWith('annotation:created', handler1);
      expect(mockSocketInstance.on).toHaveBeenCalledWith('annotation:updated', handler2);
      expect(mockSocketInstance.on).toHaveBeenCalledWith('comment:created', handler3);
    });
  });

  describe('reconnection on imageId change', () => {
    it('reconnects when imageId changes', () => {
      const { rerender } = renderHook(
        ({ imageId }) => useSocket(imageId),
        { initialProps: { imageId: 'image-A' as string | null } }
      );

      expect(io).toHaveBeenCalledTimes(1);

      // Change imageId
      rerender({ imageId: 'image-B' });

      // Should disconnect old and create new
      expect(mockSocketInstance.emit).toHaveBeenCalledWith('leave:image', {
        imageId: 'image-A',
      });
      expect(mockSocketInstance.disconnect).toHaveBeenCalled();
      expect(io).toHaveBeenCalledTimes(2);
    });
  });
});
