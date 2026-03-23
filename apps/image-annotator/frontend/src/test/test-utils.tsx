/**
 * Shared test utilities: wrapper providers, render helpers, and mocks.
 */
import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import type { User } from '../types';
import { engineerUser } from './factories';

// ---------- Auth context mock helpers ----------

interface MockAuthValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
}

const defaultAuth: MockAuthValue = {
  user: engineerUser,
  token: 'test-token-123',
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
};

let currentAuth: MockAuthValue = { ...defaultAuth };

/**
 * Set the mock auth state for subsequent renders.
 * Call before rendering components that use useAuth.
 */
export function setMockAuth(overrides: Partial<MockAuthValue> = {}) {
  currentAuth = { ...defaultAuth, ...overrides };
}

export function getMockAuth(): MockAuthValue {
  return currentAuth;
}

export function resetMockAuth() {
  currentAuth = {
    ...defaultAuth,
    login: vi.fn(),
    logout: vi.fn(),
  };
}

// The actual mock for AuthContext — import this module's `getMockAuth` in vi.mock
export const mockUseAuth = () => currentAuth;
export const MockAuthProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;

// ---------- Socket mock helpers ----------

export interface MockSocket {
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  emit: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

export function createMockSocket(): MockSocket {
  return {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  };
}

/**
 * Creates a mock useSocket hook that captures event handlers for testing real-time events.
 */
export function createMockSocketHook() {
  const eventHandlers = new Map<string, ((...args: any[]) => void)[]>();

  const onEvent = vi.fn((event: string, handler: (...args: any[]) => void) => {
    if (!eventHandlers.has(event)) {
      eventHandlers.set(event, []);
    }
    eventHandlers.get(event)!.push(handler);
    return () => {
      const handlers = eventHandlers.get(event);
      if (handlers) {
        const idx = handlers.indexOf(handler);
        if (idx >= 0) handlers.splice(idx, 1);
      }
    };
  });

  /** Simulate a socket event being received */
  function simulateEvent(event: string, data: any) {
    const handlers = eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((h) => h(data));
    }
  }

  function getHandlerCount(event: string): number {
    return eventHandlers.get(event)?.length ?? 0;
  }

  return { onEvent, simulateEvent, getHandlerCount, eventHandlers };
}

// ---------- Render helpers ----------

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string;
}

/**
 * Render with MemoryRouter (for tests that need routing).
 */
export function renderWithRouter(
  ui: React.ReactElement,
  { initialRoute = '/', ...options }: CustomRenderOptions = {}
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[initialRoute]}>{children}</MemoryRouter>
    ),
    ...options,
  });
}

/**
 * Render with BrowserRouter (for basic component tests).
 */
export function renderWithBrowserRouter(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, {
    wrapper: ({ children }) => <BrowserRouter>{children}</BrowserRouter>,
    ...options,
  });
}

// ---------- Misc helpers ----------

/**
 * Create a mock mouse event with client coordinates.
 * Useful for testing canvas drawing interactions.
 */
export function createMouseEvent(
  type: string,
  clientX: number,
  clientY: number
): MouseEvent {
  return new MouseEvent(type, {
    clientX,
    clientY,
    bubbles: true,
    cancelable: true,
  });
}

/**
 * Helper to wait for async state updates.
 */
export async function waitForStateUpdate() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Mock fetch that returns a successful JSON response.
 */
export function mockFetchSuccess(data: any, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

/**
 * Mock fetch that returns an error response.
 */
export function mockFetchError(message: string, status = 400) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ error: message }),
  });
}

/**
 * Mock fetch that rejects (network error).
 */
export function mockFetchReject(message = 'Network error') {
  return vi.fn().mockRejectedValue(new Error(message));
}
