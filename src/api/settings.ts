import { apiFetch, emitLogout } from './client';
import type { Settings, SystemInfo } from '../types';

export const settingsApi = {
  get: () => apiFetch<Settings>('/api/settings'),

  set: (key: string, value: string | boolean | number) =>
    apiFetch<{ success: boolean }>('/api/settings', { method: 'POST', body: JSON.stringify({ key, value }) }),

  systemInfo: () => apiFetch<SystemInfo>('/api/system-info'),

  async backup() {
    const token = localStorage.getItem('nexus_token');
    const res = await fetch('/api/system/backup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (res.status === 401) {
      localStorage.removeItem('nexus_token');
      localStorage.removeItem('nexus_user');
      emitLogout();
      throw new Error('Session expired. Please log in again.');
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error || 'Request failed');
    }
    return res;
  },

  restart: () =>
    apiFetch<{ success: boolean; message: string }>('/api/system/restart', { method: 'POST' }),
};
