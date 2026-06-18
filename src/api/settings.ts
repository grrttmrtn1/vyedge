import { apiFetch } from './client';
import type { Settings, SystemInfo } from '../types';

export const settingsApi = {
  get: () => apiFetch<Settings>('/api/settings'),

  set: (key: string, value: string | boolean | number) =>
    apiFetch<{ success: boolean }>('/api/settings', { method: 'POST', body: JSON.stringify({ key, value }) }),

  systemInfo: () => apiFetch<SystemInfo>('/api/system-info'),

  backup: () => fetch('/api/system/backup', {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('nexus_token')}` },
  }),

  restart: () =>
    apiFetch<{ success: boolean; message: string }>('/api/system/restart', { method: 'POST' }),
};
