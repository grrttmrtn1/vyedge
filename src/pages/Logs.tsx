import React, { useEffect, useState } from 'react';
import { Card, Badge } from '../components/UI';
import { Search, RefreshCcw, Terminal, ShieldAlert } from 'lucide-react';
import { AuditLog } from '../types';

export const Logs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    const token = localStorage.getItem('nexus_token');
    try {
      const res = await fetch('/api/logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error("Failed to fetch logs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(l => 
    l.username.toLowerCase().includes(search.toLowerCase()) || 
    l.action.toLowerCase().includes(search.toLowerCase()) || 
    l.details.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Audit Trail</h1>
          <p className="text-sm text-zinc-500">Comprehensive security logging and administrative history.</p>
        </div>
        <Button variant="outline" onClick={fetchLogs}>
          <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/30">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            <input 
              type="text" 
              placeholder="Filter audit logs..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-white border border-zinc-200 rounded-full text-xs focus:ring-2 focus:ring-zinc-900/5 transition-all w-full"
            />
          </div>
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            {filteredLogs.length} Events Logged
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Timestamp</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">User</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Action</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Details</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-zinc-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="text-xs font-bold text-zinc-900">{new Date(log.timestamp).toLocaleDateString()}</div>
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{new Date(log.timestamp).toLocaleTimeString()}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500">
                        <Terminal size={12} />
                      </div>
                      <span className="text-xs font-bold text-zinc-900">{log.username || 'System'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={log.action.includes('delete') ? 'danger' : log.action.includes('add') ? 'success' : 'info'}>
                      {log.action}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-zinc-500 font-mono max-w-xs truncate" title={log.details}>{log.details}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold text-zinc-400 font-mono">{log.ip_address || 'Internal'}</span>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <ShieldAlert className="text-zinc-200" size={32} />
                      <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">No audit events found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const Button = ({ children, variant, onClick }: any) => (
  <button 
    onClick={onClick}
    className={clsx(
      "px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
      variant === 'outline' ? "bg-white border border-zinc-200 text-zinc-900 hover:bg-zinc-50" : "bg-zinc-900 text-white hover:bg-zinc-800"
    )}
  >
    {children}
  </button>
);

import { clsx } from 'clsx';
