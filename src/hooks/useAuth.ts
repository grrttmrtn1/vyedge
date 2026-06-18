import { useState, useEffect, useCallback } from 'react';
import { apiFetch, onLogout } from '../api/client';
import type { User } from '../types';

export function useAuth() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('nexus_token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('nexus_user');
    return saved ? JSON.parse(saved) : null;
  });

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_user');
  }, []);

  useEffect(() => {
    return onLogout(logout);
  }, [logout]);

  const login = useCallback(async (username: string, password: string) => {
    const data = await apiFetch<{ token: string; user: User }>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('nexus_token', data.token);
    localStorage.setItem('nexus_user', JSON.stringify(data.user));
    return data;
  }, []);

  return { token, user, login, logout, isAuthenticated: !!token };
}
