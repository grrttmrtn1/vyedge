import { useState, useCallback, useEffect } from 'react';
import { groupsApi } from '../api/groups';
import type { RouterGroup } from '../types';

export function useGroups(isAuthenticated: boolean) {
  const [groups, setGroups] = useState<RouterGroup[]>([]);

  const fetchGroups = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await groupsApi.list();
      setGroups(data);
    } catch {
      console.error('Failed to fetch groups');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return { groups, fetchGroups, setGroups };
}
