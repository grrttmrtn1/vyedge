import { apiFetch } from './client';
import type { AuditLog } from '../types';

export interface LogFilters {
  user?: string;
  action?: string;
  router?: string;
  start?: string;
  end?: string;
}

export const logsApi = {
  list: (filters: LogFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    const qs = params.toString();
    return apiFetch<AuditLog[]>(`/api/logs${qs ? `?${qs}` : ''}`);
  },
};
