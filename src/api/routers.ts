import { apiFetch } from './client';
import type { Router } from '../types';

export const routersApi = {
  list: () => apiFetch<Router[]>('/api/routers'),

  create: (data: { name: string; url: string; api_key: string; group_id?: string }) =>
    apiFetch<{ id: string }>('/api/routers', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: { name?: string; url?: string; api_key?: string; group_id?: string | null }) =>
    apiFetch<{ success: boolean }>(`/api/routers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/routers/${id}`, { method: 'DELETE' }),

  check: (id: string) =>
    apiFetch<{ status: 'online' | 'offline' }>(`/api/routers/${id}/check`, { method: 'POST' }),
};
