import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthProvider, useAuth } from "../../context/AuthContext";
import { api } from "../../api";

vi.mock("../../api", () => ({
  api: {
    auth: {
      login: vi.fn(),
      register: vi.fn(),
    },
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("throws when used outside AuthProvider", () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow("useAuth must be used within AuthProvider");
  });

  it("initializes as logged out when no token in storage", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.token).toBeNull();
    expect(result.current.userId).toBeNull();
    expect(result.current.email).toBeNull();
  });

  it("initializes as logged in when token exists in storage", () => {
    localStorage.setItem("token", "test-token");
    localStorage.setItem("userId", "user-123");
    localStorage.setItem("email", "test@example.com");

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.token).toBe("test-token");
    expect(result.current.userId).toBe("user-123");
    expect(result.current.email).toBe("test@example.com");
  });

  it("login stores credentials and updates state", async () => {
    vi.mocked(api.auth.login).mockResolvedValue({
      token: "jwt-token",
      userId: "u1",
      email: "user@test.com",
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login("user@test.com", "password123");
    });

    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.token).toBe("jwt-token");
    expect(result.current.email).toBe("user@test.com");
    expect(localStorage.getItem("token")).toBe("jwt-token");
    expect(localStorage.getItem("userId")).toBe("u1");
  });

  it("register calls API without updating auth state", async () => {
    vi.mocked(api.auth.register).mockResolvedValue({
      id: "new-user",
      email: "new@test.com",
      name: "New User",
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.register("new@test.com", "New User", "password");
    });

    expect(api.auth.register).toHaveBeenCalledWith(
      "new@test.com",
      "New User",
      "password"
    );
    expect(result.current.isLoggedIn).toBe(false);
  });

  it("logout clears credentials from state and storage", async () => {
    localStorage.setItem("token", "test-token");
    localStorage.setItem("userId", "user-123");
    localStorage.setItem("email", "test@example.com");

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isLoggedIn).toBe(true);

    act(() => {
      result.current.logout();
    });

    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.token).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("userId")).toBeNull();
    expect(localStorage.getItem("email")).toBeNull();
  });

  it("login propagates API errors", async () => {
    vi.mocked(api.auth.login).mockRejectedValue(new Error("Invalid credentials"));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await expect(
      act(async () => {
        await result.current.login("bad@test.com", "wrong");
      })
    ).rejects.toThrow("Invalid credentials");

    expect(result.current.isLoggedIn).toBe(false);
  });
});
