import React, { useMemo } from 'react';
import {
  Server,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Plus,
  RefreshCcw,
  Download,
} from 'lucide-react';
import { motion } from 'motion/react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Card } from '../components/ui/Card';
import type { Router, RouterGroup, AuditLog } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function actionBorderColor(action: string): string {
  const a = action.toLowerCase();
  if (a.includes('login') || a.includes('auth')) return 'border-l-indigo-500';
  if (a.includes('delete') || a.includes('remove')) return 'border-l-rose-500';
  if (a.includes('add') || a.includes('create') || a.includes('register')) return 'border-l-emerald-500';
  return 'border-l-amber-500';
}

function actionDotColor(action: string): string {
  const a = action.toLowerCase();
  if (a.includes('login') || a.includes('auth')) return 'bg-indigo-500';
  if (a.includes('delete') || a.includes('remove')) return 'bg-rose-500';
  if (a.includes('add') || a.includes('create') || a.includes('register')) return 'bg-emerald-500';
  return 'bg-amber-500';
}

interface DashboardProps {
  routers: Router[];
  groups: RouterGroup[];
  logs: AuditLog[];
  onAddNode: () => void;
  onScan: () => void;
  onSync: () => void;
  onExport: () => void;
}

export function Dashboard({ routers, groups, logs, onAddNode, onScan, onSync, onExport }: DashboardProps) {
  const stats = useMemo(() => ({
    total: routers.length,
    online: routers.filter(r => r.status === 'online').length,
    offline: routers.filter(r => r.status === 'offline' || r.status === 'unknown').length,
    recentActions: logs.length,
  }), [routers, logs]);

  // Group routers by their group_id for the fleet health grid
  const routersByGroup = useMemo(() => {
    const map: { label: string; routers: Router[] }[] = [];
    groups.forEach(g => {
      const members = routers.filter(r => r.group_id === g.id);
      if (members.length > 0) map.push({ label: g.name, routers: members });
    });
    const ungrouped = routers.filter(r => !r.group_id);
    if (ungrouped.length > 0) map.push({ label: 'Ungrouped', routers: ungrouped });
    return map;
  }, [routers, groups]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      {/* Stat cards with sparklines */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          label="Total Edge Nodes"
          value={stats.total}
          icon={<Server className="text-slate-600" size={18} />}
          iconBg="bg-slate-100"
          sparkValues={[1, 1, 2, 2, 2, stats.total, stats.total]}
          sparkColor="#6366f1"
        />
        <StatCard
          label="Online Nodes"
          value={stats.online}
          icon={<CheckCircle2 className="text-emerald-500" size={18} />}
          iconBg="bg-emerald-50"
          sparkValues={[0, 1, 1, stats.online, stats.online, stats.online, stats.online]}
          sparkColor="#10b981"
        />
        <StatCard
          label="Offline / Unknown"
          value={stats.offline}
          icon={<AlertCircle className="text-rose-500" size={18} />}
          iconBg="bg-rose-50"
          sparkValues={[stats.offline, stats.offline, 0, 0, stats.offline, 0, stats.offline]}
          sparkColor="#f43f5e"
        />
        <StatCard
          label="Security Events"
          value={stats.recentActions}
          icon={<ShieldCheck className="text-amber-500" size={18} />}
          iconBg="bg-amber-50"
          sparkValues={[2, 3, 1, 4, 2, 3, stats.recentActions]}
          sparkColor="#f59e0b"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Fleet health grid */}
        <div className="lg:col-span-2">
          <Card title="Fleet Health">
            {routersByGroup.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">No routers connected</div>
            ) : (
              <div className="space-y-6">
                {routersByGroup.map(({ label, routers: groupRouters }) => (
                  <div key={label}>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">{label}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {groupRouters.map(router => (
                        <div
                          key={router.id}
                          className={cn(
                            "p-3 rounded-xl border-2 transition-all",
                            router.status === 'online'
                              ? "border-emerald-200 bg-emerald-50"
                              : router.status === 'offline'
                              ? "border-rose-200 bg-rose-50"
                              : "border-amber-200 bg-amber-50"
                          )}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full flex-shrink-0",
                              router.status === 'online' ? "bg-emerald-500" :
                              router.status === 'offline' ? "bg-rose-500" : "bg-amber-500"
                            )} />
                            <p className="text-xs font-semibold text-slate-900 truncate">{router.name}</p>
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono truncate">{router.url}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {/* Quick actions */}
          <Card title="Quick Actions">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onAddNode}
                className="flex flex-col items-center gap-2.5 p-4 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:border-indigo-100 border border-transparent transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                  <Plus size={16} className="text-slate-500 group-hover:text-indigo-600" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-indigo-600">Add Node</span>
              </button>
              <button
                onClick={onScan}
                className="flex flex-col items-center gap-2.5 p-4 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-100 border border-transparent transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                  <ShieldCheck size={16} className="text-slate-500 group-hover:text-emerald-600" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-emerald-600">Audit Scan</span>
              </button>
              <button
                onClick={onSync}
                className="flex flex-col items-center gap-2.5 p-4 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:border-indigo-100 border border-transparent transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                  <RefreshCcw size={16} className="text-slate-500 group-hover:text-indigo-600" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-indigo-600">Sync Fleet</span>
              </button>
              <button
                onClick={onExport}
                className="flex flex-col items-center gap-2.5 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-transparent transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                  <Download size={16} className="text-slate-500" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Export Data</span>
              </button>
            </div>
          </Card>

          {/* Activity feed */}
          <Card title="Recent Activity">
            <div className="space-y-1">
              {logs.slice(0, 6).map(log => (
                <div
                  key={log.id}
                  className={cn(
                    "flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors border-l-2 ml-1",
                    actionBorderColor(log.action)
                  )}
                >
                  <div className={cn("w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0", actionDotColor(log.action))} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {log.username} <span className="font-normal text-slate-500">·</span>{' '}
                      <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px] font-mono text-slate-700">{log.action}</code>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {log.router_name || 'System'} · {new Date(log.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <p className="text-center py-4 text-slate-400 text-xs">No recent activity</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({
  label,
  value,
  icon,
  iconBg,
  sparkValues,
  sparkColor,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  sparkValues?: number[];
  sparkColor?: string;
}) {
  const sparkData = sparkValues?.map(v => ({ v }));

  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", iconBg)}>
          {icon}
        </div>
      </div>
      <h3 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">{value}</h3>
      {sparkData && sparkColor && (
        <div className="h-10 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`grad-${label.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={sparkColor} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={sparkColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={sparkColor}
                strokeWidth={1.5}
                fill={`url(#grad-${label.replace(/\s/g, '')})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
