import { apiFetch } from './client';
import type { RouterGroup } from '../types';

export const groupsApi = {
  list: () => apiFetch<RouterGroup[]>('/api/router-groups'),

  create: (name: string) =>
    apiFetch<{ id: string }>('/api/router-groups', { method: 'POST', body: JSON.stringify({ name }) }),

  delete: (id: string) =>
    apiFetch<{ success: boolean; remaining: number }>(`/api/router-groups/${id}`, { method: 'DELETE' }),
};
