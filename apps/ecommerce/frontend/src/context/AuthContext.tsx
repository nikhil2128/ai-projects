import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { api } from "../api";
import type { UserRole } from "../types";

interface AuthState {
  token: string | null;
  userId: string | null;
  email: string | null;
  role: UserRole | null;
}

interface AuthContextValue extends AuthState {
  isLoggedIn: boolean;
  isSeller: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string, role?: UserRole) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadAuth(): AuthState {
  return {
    token: localStorage.getItem("token"),
    userId: localStorage.getItem("userId"),
    email: localStorage.getItem("email"),
    role: (localStorage.getItem("role") as UserRole) ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(loadAuth);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.auth.login(email, password);
    localStorage.setItem("token", result.token);
    localStorage.setItem("userId", result.userId);
    localStorage.setItem("email", result.email);
    localStorage.setItem("role", result.role);
    setAuth({ token: result.token, userId: result.userId, email: result.email, role: result.role });
  }, []);

  const register = useCallback(async (email: string, name: string, password: string, role: UserRole = "buyer") => {
    await api.auth.register(email, name, password, role);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("email");
    localStorage.removeItem("role");
    setAuth({ token: null, userId: null, email: null, role: null });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...auth,
        isLoggedIn: !!auth.token,
        isSeller: auth.role === "seller",
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
