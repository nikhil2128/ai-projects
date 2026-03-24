import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '../api';
import type { User, Profile } from '../types';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  hasProfile: boolean;
  loading: boolean;
  token: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    hasProfile: false,
    loading: true,
    token: localStorage.getItem('token'),
  });

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setState({ user: null, profile: null, hasProfile: false, loading: false, token: null });
      return;
    }

    try {
      const data = await api.auth.me();
      setState({
        user: data.user,
        profile: data.profile,
        hasProfile: data.hasProfile,
        loading: false,
        token,
      });
    } catch {
      localStorage.removeItem('token');
      setState({ user: null, profile: null, hasProfile: false, loading: false, token: null });
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const data = await api.auth.login({ email, password });
    localStorage.setItem('token', data.token);
    setState(prev => ({ ...prev, token: data.token, user: data.user }));
    await fetchUser();
  };

  const register = async (email: string, password: string, firstName?: string, lastName?: string) => {
    const data = await api.auth.register({ email, password, firstName, lastName });
    localStorage.setItem('token', data.token);
    setState(prev => ({ ...prev, token: data.token, user: data.user }));
    await fetchUser();
  };

  const logout = () => {
    localStorage.removeItem('token');
    setState({ user: null, profile: null, hasProfile: false, loading: false, token: null });
  };

  const refreshProfile = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
