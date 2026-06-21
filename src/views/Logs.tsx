import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  ShieldCheck,
} from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import type { AuditLog } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LogsProps {
  token: string;
}

export function Logs({ token }: LogsProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({
    user: '',
    action: '',
    router: '',
    start: '',
    end: ''
  });

  const fetchLogs = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.user) params.append('user', filters.user);
    if (filters.action) params.append('action', filters.action);
    if (filters.router) params.append('router', filters.router);
    if (filters.start) params.append('start', filters.start);
    if (filters.end) params.append('end', filters.end);

    const res = await fetch(`/api/logs?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (Array.isArray(data)) setLogs(data);
  }, [token, filters]);

  useEffect(() => {
    const init = async () => {
      await fetchLogs();
    };
    init();
  }, [fetchLogs]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-slate-50">Global Audit Trail</h3>
          <p className="text-sm text-zinc-500 dark:text-slate-400">Immutable record of all administrative actions across the fleet.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const headers = ['Timestamp', 'Operator', 'Action', 'Target Node', 'Details', 'IP Address'];
              const rows = logs.map(log => [
                new Date(log.timestamp).toISOString(),
                log.username || 'Unknown',
                log.action,
                log.router_name || 'System',
                `"${(log.details || '').replace(/"/g, '""')}"`,
                log.ip_address || ''
              ]);
              const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `vyedge-audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download size={14} /> Export CSV
          </Button>
          <Button variant={showFilter ? 'primary' : 'secondary'} size="sm" onClick={() => setShowFilter(!showFilter)}>
            <Filter size={14} /> Advanced Filter
          </Button>
        </div>
      </div>

      {showFilter && (
        <Card className="p-6 bg-zinc-50 border-zinc-200 dark:bg-slate-800/50 dark:border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
            <Input label="User" value={filters.user} onChange={e => setFilters({...filters, user: e.target.value})} placeholder="admin" />
            <Input label="Action" value={filters.action} onChange={e => setFilters({...filters, action: e.target.value})} placeholder="delete_router" />
            <Input label="Router/Details" value={filters.router} onChange={e => setFilters({...filters, router: e.target.value})} placeholder="Edge-01" />
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-600 dark:text-slate-400">Start Date</label>
              <input type="date" className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm h-[38px] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" value={filters.start} onChange={e => setFilters({...filters, start: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-600 dark:text-slate-400">End Date</label>
              <input type="date" className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm h-[38px] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" value={filters.end} onChange={e => setFilters({...filters, end: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" size="sm" onClick={() => setFilters({ user: '', action: '', router: '', start: '', end: '' })}>Reset</Button>
            <Button size="sm" onClick={fetchLogs}>Apply Filters</Button>
          </div>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100 dark:bg-slate-800/50 dark:border-slate-700">
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-400 dark:text-slate-500 uppercase tracking-widest">Timestamp</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-400 dark:text-slate-500 uppercase tracking-widest">Operator</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-400 dark:text-slate-500 uppercase tracking-widest">Action</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-400 dark:text-slate-500 uppercase tracking-widest">Target Node</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-400 dark:text-slate-500 uppercase tracking-widest">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-slate-700">
              {logs.map((log) => (
                <React.Fragment key={log.id}>
                  <tr
                    className={cn(
                      "hover:bg-zinc-50/50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer",
                      expandedLog === log.id && "bg-zinc-50/80 dark:bg-slate-700/50"
                    )}
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Clock size={12} className="text-zinc-300" />
                        <span className="text-xs font-mono text-zinc-500 dark:text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-zinc-500 dark:text-slate-400">
                          {(log.username?.[0] || '?').toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-zinc-900 dark:text-slate-100">{log.username || 'Deleted User'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest",
                        log.action === 'LOGIN' ? "bg-blue-50 text-blue-600" :
                        log.action === 'CONFIGURE' ? "bg-amber-50 text-amber-600" :
                        log.action === 'DELETE' ? "bg-red-50 text-red-600" : "bg-zinc-100 text-zinc-600 dark:bg-slate-700 dark:text-slate-300"
                      )}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-zinc-500 dark:text-slate-400">{log.router_name || 'System'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-zinc-400 dark:text-slate-500 truncate max-w-xs font-medium italic">"{log.details}"</p>
                        {expandedLog === log.id ? <ChevronUp size={14} className="text-zinc-300" /> : <ChevronDown size={14} className="text-zinc-300" />}
                      </div>
                    </td>
                  </tr>
                  {expandedLog === log.id && (
                    <tr className="bg-zinc-50/30 dark:bg-slate-800/30">
                      <td colSpan={5} className="px-6 py-6">
                        <div className="bg-zinc-900 rounded-2xl p-6 shadow-inner">
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4">Payload Context</p>
                          <pre className="text-xs font-mono text-emerald-400/90 whitespace-pre-wrap leading-relaxed">
                            {(() => {
                              try {
                                return JSON.stringify(JSON.parse(log.details), null, 2);
                              } catch (e) {
                                return log.details;
                              }
                            })()}
                          </pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <ShieldCheck size={32} className="text-zinc-200" />
                      <p className="text-sm font-medium text-zinc-400 dark:text-slate-500 italic">No audit records found in the current period.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </motion.div>
  );
}
