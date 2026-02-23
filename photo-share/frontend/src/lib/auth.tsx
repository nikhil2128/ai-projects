'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { api, type AuthUser, type VerificationStatusResponse } from './api';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  verification: VerificationStatusResponse | null;
  refreshVerification: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState<VerificationStatusResponse | null>(null);

  const fetchVerification = useCallback(async () => {
    try {
      const status = await api.verification.getStatus();
      setVerification(status);
    } catch {
      // Silently fail — verification fetch is non-critical
    }
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      api.auth
        .me()
        .then((u) => {
          setUser(u);
          fetchVerification();
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchVerification]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.auth.login({ username, password });
    localStorage.setItem('token', res.accessToken);
    localStorage.setItem('refreshToken', res.refreshToken);
    setToken(res.accessToken);
    setUser(res.user);
    fetchVerification();
  }, [fetchVerification]);

  const register = useCallback(
    async (
      username: string,
      email: string,
      password: string,
      displayName?: string,
    ) => {
      const res = await api.auth.register({
        username,
        email,
        password,
        displayName,
      });
      localStorage.setItem('token', res.accessToken);
      localStorage.setItem('refreshToken', res.refreshToken);
      setToken(res.accessToken);
      setUser(res.user);
      // Delay verification fetch — backend is processing asynchronously
      setTimeout(fetchVerification, 3000);
    },
    [fetchVerification],
  );

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setToken(null);
    setUser(null);
    setVerification(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        verification,
        refreshVerification: fetchVerification,
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
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
