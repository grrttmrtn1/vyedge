import { useState, useCallback, useEffect } from 'react';
import { routersApi } from '../api/routers';
import type { Router } from '../types';

export function useRouters(isAuthenticated: boolean) {
  const [routers, setRouters] = useState<Router[]>([]);

  const fetchRouters = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await routersApi.list();
      setRouters(data);
    } catch {
      console.error('Failed to fetch routers');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchRouters();
  }, [fetchRouters]);

  return { routers, fetchRouters, setRouters };
}
