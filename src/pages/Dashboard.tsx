import React, { useEffect, useState } from 'react';
import { Card, Badge } from '../components/UI';
import { Network, Shield, Lock, Activity, Server, Cpu, Zap, Globe } from 'lucide-react';
import { motion } from 'motion/react';
import { AuditLog } from '../types';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    routes: 0,
    firewall: 0,
    vpn: 0,
    logs: 0
  });
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [systemInfo, setSystemInfo] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('nexus_token');
      const headers = { Authorization: `Bearer ${token}` };
      
      try {
        const [routes, firewall, vpn, logs, info] = await Promise.all([
          fetch('/api/routes', { headers }).then(r => r.json()),
          fetch('/api/firewall', { headers }).then(r => r.json()),
          fetch('/api/vpn', { headers }).then(r => r.json()),
          fetch('/api/logs', { headers }).then(r => r.json()),
          fetch('/api/system-info', { headers }).then(r => r.json())
        ]);

        setStats({
          routes: routes.length,
          firewall: firewall.length,
          vpn: vpn.length,
          logs: logs.length
        });
        setRecentLogs(logs.slice(0, 5));
        setSystemInfo(info);
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Active Routes" value={stats.routes} icon={<Network className="text-blue-500" />} />
        <StatCard label="Firewall Rules" value={stats.firewall} icon={<Shield className="text-emerald-500" />} />
        <StatCard label="VPN Tunnels" value={stats.vpn} icon={<Lock className="text-violet-500" />} />
        <StatCard label="Audit Events" value={stats.logs} icon={<Activity className="text-amber-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card title="Recent Security Events" subtitle="Latest administrative actions and system changes">
            <div className="space-y-4">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 p-4 rounded-2xl hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-100">
                  <div className="mt-1 w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-500">
                    <Zap size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-zinc-900">
                        {log.username} <span className="font-medium text-zinc-500">performed</span> <code className="bg-zinc-900 text-white px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider">{log.action}</code>
                      </p>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 font-mono truncate">{log.details}</p>
                  </div>
                </div>
              ))}
              {recentLogs.length === 0 && (
                <div className="text-center py-12">
                  <Activity className="mx-auto text-zinc-200 mb-2" size={32} />
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">No recent activity</p>
                </div>
              )}
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Network Traffic" subtitle="Ingress/Egress overview">
              <div className="h-48 flex items-end gap-2 px-2">
                {[40, 70, 45, 90, 65, 80, 55, 75, 60, 85, 50, 95].map((h, i) => (
                  <div key={i} className="flex-1 bg-zinc-100 rounded-t-lg relative group">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      className="absolute bottom-0 left-0 right-0 bg-zinc-900 rounded-t-lg group-hover:bg-blue-500 transition-colors"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                <span>00:00</span>
                <span>12:00</span>
                <span>23:59</span>
              </div>
            </Card>
            <Card title="System Performance" subtitle="CPU and Memory utilization">
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                    <span className="text-zinc-500">CPU Usage</span>
                    <span className="text-zinc-900">24%</span>
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[24%]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                    <span className="text-zinc-500">Memory</span>
                    <span className="text-zinc-900">1.2 GB / 4 GB</span>
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-[30%]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                    <span className="text-zinc-500">Storage</span>
                    <span className="text-zinc-900">15%</span>
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-zinc-900 w-[15%]" />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="space-y-8">
          <Card title="Gateway Status">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Server size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Primary Node</p>
                  <h4 className="text-sm font-bold text-zinc-900">Nexus-Edge-01</h4>
                </div>
                <Badge variant="success">Online</Badge>
              </div>
              
              <div className="pt-6 border-t border-zinc-100 space-y-4">
                <InfoItem label="Uptime" value={systemInfo ? `${Math.floor(systemInfo.uptime / 3600)}h ${Math.floor((systemInfo.uptime % 3600) / 60)}m` : '...'} />
                <InfoItem label="Version" value={systemInfo?.version || '...'} />
                <InfoItem label="Platform" value={systemInfo?.platform || '...'} />
                <InfoItem label="Architecture" value={systemInfo?.arch || '...'} />
              </div>
            </div>
          </Card>

          <Card title="Quick Actions">
            <div className="grid grid-cols-2 gap-3">
              <QuickAction icon={<Globe size={18} />} label="Public IP" value="192.168.1.1" />
              <QuickAction icon={<Lock size={18} />} label="VPN Status" value="Connected" />
              <QuickAction icon={<Shield size={18} />} label="IPS/IDS" value="Active" />
              <QuickAction icon={<Cpu size={18} />} label="Load" value="0.45" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) => (
  <Card className="relative overflow-hidden group hover:border-zinc-900/20 transition-all">
    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
      {React.cloneElement(icon as React.ReactElement, { size: 64 })}
    </div>
    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{label}</p>
    <h3 className="text-4xl font-bold text-zinc-900 tracking-tight">{value}</h3>
  </Card>
);

const InfoItem = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-center">
    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{label}</span>
    <span className="text-xs font-bold text-zinc-900">{value}</span>
  </div>
);

const QuickAction = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-100 hover:border-zinc-200 transition-all cursor-pointer group">
    <div className="text-zinc-400 group-hover:text-zinc-900 transition-colors mb-2">{icon}</div>
    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest leading-none mb-1">{label}</p>
    <p className="text-xs font-bold text-zinc-900 truncate">{value}</p>
  </div>
);
