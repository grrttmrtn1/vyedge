import React, { useMemo } from 'react';
import {
  Server,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Plus,
  RefreshCcw,
  Download,
  Terminal as TerminalIcon,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import type { Router, AuditLog } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DashboardProps {
  routers: Router[];
  logs: AuditLog[];
  onAddNode: () => void;
  onScan: () => void;
  onSync: () => void;
  onExport: () => void;
}

export function Dashboard({ routers, logs, onAddNode, onScan, onSync, onExport }: DashboardProps) {
  const stats = useMemo(() => ({
    total: routers.length,
    online: routers.filter(r => r.status === 'online').length,
    offline: routers.filter(r => r.status === 'offline' || r.status === 'unknown').length,
    recentActions: logs.length
  }), [routers, logs]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          label="Total Edge Nodes"
          value={stats.total}
          icon={<Server className="text-zinc-900" />}
        />
        <StatCard
          label="Online Nodes"
          value={stats.online}
          icon={<CheckCircle2 className="text-emerald-500" />}
        />
        <StatCard
          label="Offline Nodes"
          value={stats.offline}
          icon={<AlertCircle className="text-red-500" />}
        />
        <StatCard
          label="Security Events"
          value={stats.recentActions}
          icon={<ShieldCheck className="text-amber-500" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card title="Active Edge Nodes">
            <div className="space-y-3">
              {routers.map(router => (
                <div key={router.id} className="flex items-center justify-between p-3 border border-zinc-100 rounded-xl bg-white hover:shadow-sm transition-all">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full ring-4 ring-offset-0",
                      router.status === 'online' ? "bg-emerald-500 ring-emerald-500/10" :
                      router.status === 'offline' ? "bg-red-500 ring-red-500/10" : "bg-zinc-300 ring-zinc-300/10"
                    )} />
                    <div>
                      <span className="text-sm font-bold text-zinc-900 block">{router.name}</span>
                      <span className="text-[10px] font-mono text-zinc-400">{router.url}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest",
                      router.status === 'online' ? "bg-emerald-50 text-emerald-600" :
                      router.status === 'offline' ? "bg-red-50 text-red-600" : "bg-zinc-50 text-zinc-400"
                    )}>{router.status}</div>
                  </div>
                </div>
              ))}
              {routers.length === 0 && (
                <div className="text-center py-8 text-zinc-400 text-sm">No routers connected</div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          <Card title="Quick Actions" subtitle="Common administrative tasks">
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" size="sm" className="flex-col py-4 h-auto gap-3 rounded-2xl" onClick={onAddNode}>
                <Plus size={18} className="text-zinc-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Add Node</span>
              </Button>
              <Button variant="secondary" size="sm" className="flex-col py-4 h-auto gap-3 rounded-2xl" onClick={onScan}>
                <ShieldCheck size={18} className="text-emerald-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Audit Scan</span>
              </Button>
              <Button variant="secondary" size="sm" className="flex-col py-4 h-auto gap-3 rounded-2xl" onClick={onSync}>
                <RefreshCcw size={18} className="text-blue-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Sync Fleet</span>
              </Button>
              <Button variant="secondary" size="sm" className="flex-col py-4 h-auto gap-3 rounded-2xl" onClick={onExport}>
                <Download size={18} className="text-zinc-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Export Data</span>
              </Button>
            </div>
          </Card>

          <Card title="Recent Security Audit">
            <div className="space-y-4">
              {logs.slice(0, 5).map(log => (
                <div key={log.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-100">
                  <div className="mt-1 w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500">
                    <TerminalIcon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900">
                      <span className="font-bold">{log.username}</span> <span className="text-zinc-500">executed</span> <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-[10px] font-bold text-zinc-700">{log.action}</code>
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{log.router_name || 'System'}</p>
                      <span className="text-zinc-300">•</span>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{new Date(log.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                </div>
              ))}
              {logs.length === 0 && <p className="text-center py-4 text-zinc-400 text-xs">No recent activity</p>}
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, trend, trendUp, icon, subtext }: {
  label: string;
  value: number | string;
  trend?: string;
  trendUp?: boolean;
  icon: React.ReactNode;
  subtext?: string;
}) {
  return (
    <Card className="relative overflow-hidden group border-zinc-200/60 hover:border-zinc-300 transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.15em] mb-2">{label}</p>
          <h3 className="text-2xl font-bold text-zinc-900 tracking-tight">{value}</h3>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trendUp !== undefined && (
                trendUp ? <ArrowUpRight size={12} className="text-emerald-500" /> : <ArrowDownRight size={12} className="text-red-500" />
              )}
              <span className={cn(
                "text-[10px] font-bold",
                trendUp === true ? "text-emerald-600" : trendUp === false ? "text-red-600" : "text-zinc-500"
              )}>{trend}</span>
              <span className="text-[10px] text-zinc-400 ml-1">vs last 24h</span>
            </div>
          )}
          {subtext && <p className="text-[10px] text-zinc-400 mt-1 font-medium">{subtext}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center border border-zinc-100 group-hover:scale-110 transition-transform">
          {icon}
        </div>
      </div>
    </Card>
  );
}
