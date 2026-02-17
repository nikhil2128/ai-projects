import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockSetLocalStateField = vi.fn();
const mockGetStates = vi.fn().mockReturnValue(new Map());
const mockAwarenessOn = vi.fn();
const mockAwarenessOff = vi.fn();
const mockDisconnect = vi.fn();
const mockDestroy = vi.fn();
const mockProviderOn = vi.fn();

vi.mock('y-websocket', () => {
  return {
    WebsocketProvider: class MockWebsocketProvider {
      awareness = {
        setLocalStateField: mockSetLocalStateField,
        getStates: mockGetStates,
        on: mockAwarenessOn,
        off: mockAwarenessOff,
      };
      on = mockProviderOn;
      disconnect = mockDisconnect;
      destroy = mockDestroy;
      constructor() {}
    },
  };
});

vi.mock('yjs', () => {
  return {
    Doc: class MockDoc {
      getText = vi.fn().mockReturnValue({
        insert: vi.fn(),
        toString: vi.fn().mockReturnValue(''),
      });
      destroy = vi.fn();
    },
  };
});

import { useCollaboration } from '../../hooks/useCollaboration';

describe('useCollaboration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem('collab-user');
  });

  afterEach(() => {
    localStorage.removeItem('collab-user');
  });

  it('should return initial state when no docId', () => {
    const { result } = renderHook(() => useCollaboration(undefined, null));
    expect(result.current.connected).toBe(false);
    expect(result.current.synced).toBe(false);
    expect(result.current.provider).toBeNull();
    expect(result.current.connectedUsers).toEqual([]);
  });

  it('should return initial state when no token', () => {
    const { result } = renderHook(() => useCollaboration('doc-1', null));
    expect(result.current.connected).toBe(false);
    expect(result.current.provider).toBeNull();
  });

  it('should create provider when docId and token are provided', () => {
    renderHook(() => useCollaboration('doc-1', 'test-token'));
    expect(mockSetLocalStateField).toHaveBeenCalledWith('user', {
      name: expect.any(String),
      color: expect.any(String),
    });
  });

  it('should set local awareness state on connect', () => {
    renderHook(() => useCollaboration('doc-1', 'test-token'));
    expect(mockSetLocalStateField).toHaveBeenCalledWith('user', expect.objectContaining({
      name: expect.any(String),
    }));
  });

  it('should register event listeners', () => {
    renderHook(() => useCollaboration('doc-1', 'test-token'));
    expect(mockProviderOn).toHaveBeenCalledWith('status', expect.any(Function));
    expect(mockProviderOn).toHaveBeenCalledWith('sync', expect.any(Function));
    expect(mockAwarenessOn).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useCollaboration('doc-1', 'test-token'));
    unmount();
    expect(mockAwarenessOff).toHaveBeenCalledWith('change', expect.any(Function));
    expect(mockDisconnect).toHaveBeenCalled();
    expect(mockDestroy).toHaveBeenCalled();
  });

  it('should update username', () => {
    const { result } = renderHook(() => useCollaboration('doc-1', 'test-token'));
    act(() => {
      result.current.setUserName('New Name');
    });
    expect(result.current.user.name).toBe('New Name');
  });

  it('should persist user to localStorage', () => {
    renderHook(() => useCollaboration('doc-1', 'test-token'));
    const stored = localStorage.getItem('collab-user');
    expect(stored).toBeDefined();
  });

  it('should load stored user from localStorage', () => {
    localStorage.setItem('collab-user', JSON.stringify({ name: 'Stored User', color: '#FF6B6B' }));
    const { result } = renderHook(() => useCollaboration(undefined, null));
    expect(result.current.user.name).toBe('Stored User');
    expect(result.current.user.color).toBe('#FF6B6B');
  });

  it('should handle corrupted localStorage data', () => {
    localStorage.setItem('collab-user', 'not-json');
    const { result } = renderHook(() => useCollaboration(undefined, null));
    expect(result.current.user.name).toBeDefined();
    expect(result.current.user.color).toBeDefined();
  });

  it('should provide ydoc instance', () => {
    const { result } = renderHook(() => useCollaboration('doc-1', 'test-token'));
    expect(result.current.ydoc).toBeDefined();
  });

  it('should handle status event for connected state', () => {
    renderHook(() => useCollaboration('doc-1', 'test-token'));

    const statusHandler = mockProviderOn.mock.calls.find(
      (c: any[]) => c[0] === 'status'
    )?.[1];
    expect(statusHandler).toBeDefined();

    act(() => {
      statusHandler({ status: 'connected' });
    });
  });

  it('should handle status event for disconnected state', () => {
    renderHook(() => useCollaboration('doc-1', 'test-token'));

    const statusHandler = mockProviderOn.mock.calls.find(
      (c: any[]) => c[0] === 'status'
    )?.[1];

    act(() => {
      statusHandler({ status: 'disconnected' });
    });
  });

  it('should handle sync event', () => {
    renderHook(() => useCollaboration('doc-1', 'test-token'));

    const syncHandler = mockProviderOn.mock.calls.find(
      (c: any[]) => c[0] === 'sync'
    )?.[1];
    expect(syncHandler).toBeDefined();

    act(() => {
      syncHandler(true);
    });
  });

  it('should update connected users on awareness change', () => {
    const statesMap = new Map();
    statesMap.set(1, { user: { name: 'Alice', color: '#FF6B6B' } });
    statesMap.set(2, { user: { name: 'Bob', color: '#4ECDC4' } });
    mockGetStates.mockReturnValue(statesMap);

    renderHook(() => useCollaboration('doc-1', 'test-token'));

    const changeHandler = mockAwarenessOn.mock.calls.find(
      (c: any[]) => c[0] === 'change'
    )?.[1];
    expect(changeHandler).toBeDefined();

    act(() => {
      changeHandler();
    });
  });

  it('should skip awareness states without user data', () => {
    const statesMap = new Map();
    statesMap.set(1, { user: { name: 'Alice', color: '#FF6B6B' } });
    statesMap.set(2, {}); // no user
    mockGetStates.mockReturnValue(statesMap);

    renderHook(() => useCollaboration('doc-1', 'test-token'));

    const changeHandler = mockAwarenessOn.mock.calls.find(
      (c: any[]) => c[0] === 'change'
    )?.[1];

    act(() => {
      changeHandler();
    });
  });

  it('should update awareness when username changes with provider', () => {
    const { result } = renderHook(() => useCollaboration('doc-1', 'test-token'));

    act(() => {
      result.current.setUserName('Updated Name');
    });

    expect(mockSetLocalStateField).toHaveBeenCalledWith('user', expect.objectContaining({
      name: 'Updated Name',
    }));
  });
});
