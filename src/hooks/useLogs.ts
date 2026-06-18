import { useState, useCallback, useEffect } from 'react';
import { logsApi, type LogFilters } from '../api/logs';
import type { AuditLog } from '../types';

export function useLogs(isAuthenticated: boolean) {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const fetchLogs = useCallback(async (filters: LogFilters = {}) => {
    if (!isAuthenticated) return;
    try {
      const data = await logsApi.list(filters);
      setLogs(data);
    } catch {
      console.error('Failed to fetch logs');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, fetchLogs };
}
