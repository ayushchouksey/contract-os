'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { api } from '@/lib/api';
import { clearToken, clearUserData, getToken, getUser, setToken, setUserData, User } from '@/lib/auth';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    orgName?: string;
  }) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    return getUser();
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      clearUserData();
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get<User>('/auth/me');
      setUser(res.data);
      setUserData(res.data);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        clearToken();
        clearUserData();
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ accessToken: string; user: User }>(
      '/auth/login',
      { email, password },
    );
    setToken(res.data.accessToken);
    setUserData(res.data.user);
    setUser(res.data.user);
  }, []);

  const register = useCallback(
    async (data: { name: string; email: string; password: string; orgName?: string }) => {
      const res = await api.post<{ accessToken: string; user: User }>(
        '/auth/register',
        data,
      );
      setToken(res.data.accessToken);
      setUserData(res.data.user);
      setUser(res.data.user);
    },
    [],
  );

  const logout = useCallback(() => {
    clearToken();
    clearUserData();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refresh }}
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