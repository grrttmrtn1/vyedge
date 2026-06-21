import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useRouterMetrics } from '../hooks/useRouterMetrics';
import type { RouterMetrics } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function formatTime(epochMs: number): string {
  const d = new Date(epochMs);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

interface ChartPoint {
  time: string;
  value: number | null;
}

function buildCpuSeries(history: RouterMetrics[]): ChartPoint[] {
  return history.map(m => ({
    time: formatTime(m.collectedAt),
    value: m.cpu != null ? m.cpu.loadPercent : null,
  }));
}

function buildMemorySeries(history: RouterMetrics[]): ChartPoint[] {
  return history.map(m => ({
    time: formatTime(m.collectedAt),
    value: m.memory != null ? m.memory.usedPercent : null,
  }));
}

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
}

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-1">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

interface MetricsChartProps {
  title: string;
  color: string;
  data: ChartPoint[];
}

function MetricsChart({ title, color, data }: MetricsChartProps) {
  return (
    <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm p-6 space-y-3">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</p>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v}%`}
              width={36}
            />
            <Tooltip
              contentStyle={{
                background: '#0f172a',
                border: 'none',
                borderRadius: '8px',
                fontSize: '11px',
                color: '#f1f5f9',
                padding: '6px 10px',
              }}
              formatter={(v: number | null) => (v != null ? [`${v.toFixed(1)}%`, title] : ['—', title])}
              labelStyle={{ color: '#94a3b8', marginBottom: '2px' }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface RouterMetricsTabProps {
  routerId: string;
  token: string;
}

export function RouterMetricsTab({ routerId, token }: RouterMetricsTabProps) {
  const { latest, history } = useRouterMetrics(routerId, token);

  if (history.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-20 gap-4 text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
          <Activity size={24} className="text-indigo-400 animate-pulse" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">Waiting for metrics…</p>
          <p className="text-xs text-slate-400 mt-1">Data will appear once the first SSE event arrives.</p>
        </div>
      </motion.div>
    );
  }

  const cpuData = buildCpuSeries(history);
  const memData = buildMemorySeries(history);

  const uptimeStr = latest?.uptime?.str ?? '—';
  const totalRoutes = latest?.routes != null ? String(latest.routes.total) : '—';
  const activeVpn = latest?.vpnPeers != null ? String(latest.vpnPeers.active) : '—';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('space-y-6')}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MetricsChart title="CPU %" color="#6366f1" data={cpuData} />
        <MetricsChart title="Memory %" color="#8b5cf6" data={memData} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Uptime" value={uptimeStr} />
        <StatCard label="Total Routes" value={totalRoutes} />
        <StatCard label="Active VPN Peers" value={activeVpn} />
      </div>
    </motion.div>
  );
}
