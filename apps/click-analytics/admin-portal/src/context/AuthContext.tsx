import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { User } from "../types";
import { authenticateUser, DEMO_USERS } from "../data/mock";

interface AuthContextType {
  user: Omit<User, "password"> | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => { success: boolean; error?: string };
  register: (name: string, email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "clickpulse_auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Omit<User, "password"> | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const login = useCallback((email: string, password: string) => {
    const found = authenticateUser(email, password);
    if (!found) return { success: false, error: "Invalid email or password" };
    const { password: _, ...safeUser } = found;
    setUser(safeUser);
    return { success: true };
  }, []);

  const register = useCallback((name: string, email: string, _password: string) => {
    const exists = DEMO_USERS.some((u) => u.email === email);
    if (exists) return { success: false, error: "An account with this email already exists" };

    const newUser: Omit<User, "password"> = {
      id: `usr_${Date.now()}`,
      name,
      email,
      company: "My Company",
      avatar: name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2),
      websites: [
        { id: `ws_new_${Date.now()}`, domain: "my-website.com", name: "My Website", favicon: "MW", addedAt: new Date().toISOString().slice(0, 10), status: "active" },
      ],
    };
    setUser(newUser);
    return { success: true };
  }, []);

  const logout = useCallback(() => setUser(null), []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
