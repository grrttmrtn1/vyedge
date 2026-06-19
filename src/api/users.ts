import { apiFetch } from './client';
import type { User } from '../types';

export const usersApi = {
  list: () => apiFetch<User[]>('/api/users'),

  create: (data: { username: string; password: string; role: 'admin' | 'operator' | 'read-only' }) =>
    apiFetch<{ id: string }>('/api/users', { method: 'POST', body: JSON.stringify(data) }),

  updatePassword: (id: string, password: string) =>
    apiFetch<{ success: boolean }>(`/api/users/${id}/password`, { method: 'PATCH', body: JSON.stringify({ password }) }),

  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/users/${id}`, { method: 'DELETE' }),

  getGroups: (id: string) =>
    apiFetch<string[]>(`/api/users/${id}/groups`),

  setGroups: (id: string, groupIds: string[]) =>
    apiFetch<{ success: boolean }>(`/api/users/${id}/groups`, { method: 'PUT', body: JSON.stringify({ groupIds }) }),
};
