import React, { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Play, Square, RotateCcw, RefreshCw, AlertCircle, Box } from 'lucide-react';
import { vyosApi } from '../api/vyos';

const cn = (...args: Parameters<typeof clsx>) => twMerge(clsx(args));

interface Container {
  name: string;
  image: string;
  state: 'running' | 'stopped' | 'unknown';
  ports: string;
}

interface ContainersTabProps {
  routerId: string;
  token: string;
}

function parseContainerText(text: string, config: Record<string, any>): Container[] {
  // Build state map from op-mode text output
  const stateMap: Record<string, 'running' | 'stopped'> = {};
  if (typeof text === 'string') {
    const lines = text.split('\n').slice(1); // skip header
    for (const line of lines) {
      const parts = line.trim().split(/\s{2,}/);
      if (parts.length >= 5) {
        const name = parts[0] ?? '';
        const status = parts[4]?.toLowerCase() ?? '';
        if (name) stateMap[name] = status.includes('run') ? 'running' : 'stopped';
      }
    }
  }

  // Merge with config for image/port info
  return Object.entries(config).map(([name, cfg]: [string, any]) => {
    const ports = Object.values(cfg?.port ?? {})
      .map((p: any) => `${p.source}:${p.destination}/${p.protocol ?? 'tcp'}`)
      .join(', ');
    return {
      name,
      image: cfg?.image ?? '—',
      state: stateMap[name] ?? 'unknown',
      ports: ports || '—',
    };
  });
}

export function ContainersTab({ routerId }: ContainersTabProps) {
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);

  const fetchContainers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [configRes, stateRes] = await Promise.allSettled([
        vyosApi.send(routerId, 'show', { op: 'showConfig', path: ['container', 'name'] }) as Promise<any>,
        vyosApi.send(routerId, 'op', { op: 'show', path: ['container'] }) as Promise<any>,
      ]);
      if (configRes.status === 'rejected' && stateRes.status === 'rejected') {
        setError(configRes.reason?.message ?? 'Failed to load containers');
        return;
      }
      const config = configRes.status === 'fulfilled' ? (configRes.value?.data ?? {}) : {};
      const stateText = stateRes.status === 'fulfilled' ? (stateRes.value?.data ?? '') : '';
      setContainers(parseContainerText(stateText, config));
    } catch (e: any) {
      setError(e.message ?? 'Failed to load containers');
    } finally {
      setLoading(false);
    }
  }, [routerId]);

  React.useEffect(() => { fetchContainers(); }, [fetchContainers]);

  const containerAction = async (name: string, action: 'start' | 'stop' | 'restart') => {
    setActioning(`${name}-${action}`);
    setError(null);
    try {
      await vyosApi.send(routerId, 'op', { op: action, path: ['container', 'name', name] });
      await fetchContainers();
    } catch (e: any) {
      setError(e.message ?? `Failed to ${action} container`);
    } finally {
      setActioning(null);
    }
  };

  const stateColor = (state: Container['state']) => {
    if (state === 'running') return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400';
    if (state === 'stopped') return 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400';
    return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Containers</h3>
        <button
          onClick={fetchContainers}
          disabled={loading}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-400 text-xs">
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-12 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />)}
        </div>
      ) : containers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500 gap-2">
          <Box size={24} className="opacity-50" />
          <p className="text-sm">No containers configured</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-700">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Name</th>
                <th className="px-4 py-2.5 text-left font-medium">Image</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
                <th className="px-4 py-2.5 text-left font-medium">Ports</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {containers.map(c => (
                <tr key={c.name} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <td className="px-4 py-2.5 font-mono font-medium text-slate-900 dark:text-slate-100">{c.name}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-500 dark:text-slate-400">{c.image}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', stateColor(c.state))}>
                      {c.state}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-slate-500 dark:text-slate-400">{c.ports}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => containerAction(c.name, 'start')}
                        disabled={!!actioning || c.state === 'running'}
                        className="p-1 rounded text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors disabled:opacity-30"
                        title="Start"
                      >
                        <Play size={12} />
                      </button>
                      <button
                        onClick={() => containerAction(c.name, 'stop')}
                        disabled={!!actioning || c.state === 'stopped'}
                        className="p-1 rounded text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors disabled:opacity-30"
                        title="Stop"
                      >
                        <Square size={12} />
                      </button>
                      <button
                        onClick={() => containerAction(c.name, 'restart')}
                        disabled={!!actioning}
                        className="p-1 rounded text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors disabled:opacity-30"
                        title="Restart"
                      >
                        <RotateCcw size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
