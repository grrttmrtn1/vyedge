import { apiFetch } from './client';

export const vyosApi = {
  send: (routerId: string, action: string, data: unknown) =>
    apiFetch<unknown>(`/api/vyos/${routerId}/${action}`, {
      method: 'POST',
      body: JSON.stringify({ data }),
    }),
};
