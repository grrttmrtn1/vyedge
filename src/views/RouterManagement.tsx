import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Network,
  Globe,
  ShieldCheck,
  Lock,
  Zap,
  Cpu,
  Terminal as TerminalIcon,
  ChevronRight,
  RefreshCcw,
  Activity,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import type { Router } from '../types';
import { ConfigNode } from './ConfigBrowser';
import { ConfigTerminal } from './ConfigTerminal';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface RouterManagementProps {
  router: Router;
  token: string;
  onBack: () => void;
}

export function RouterManagement({ router, token, onBack }: RouterManagementProps) {
  const [activeTab, setActiveTab] = useState<'interfaces' | 'routing' | 'firewall' | 'vpn' | 'services' | 'system' | 'terminal'>('interfaces');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tabs = useMemo(() => [
    { id: 'interfaces', label: 'Interfaces', icon: <Network size={16} />, path: ['interfaces'] },
    { id: 'routing', label: 'Routing', icon: <Globe size={16} />, path: ['protocols'] },
    { id: 'firewall', label: 'Firewall', icon: <ShieldCheck size={16} />, path: ['firewall'] },
    { id: 'vpn', label: 'VPN', icon: <Lock size={16} />, path: ['vpn'] },
    { id: 'services', label: 'Services', icon: <Zap size={16} />, path: ['service'] },
    { id: 'system', label: 'System', icon: <Cpu size={16} />, path: ['system'] },
    { id: 'terminal', label: 'Terminal', icon: <TerminalIcon size={16} />, path: null },
  ], []);

  const fetchData = useCallback(async (path: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/vyos/${router.id}/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ data: { op: 'showConfig', path } })
      });
      const result = await res.json();
      if (res.ok) {
        setData(result.data);
      } else {
        setError(result.details || "Failed to fetch data");
      }
    } catch {
      setError("Communication error");
    } finally {
      setLoading(false);
    }
  }, [router.id, token]);

  useEffect(() => {
    const tab = tabs.find(t => t.id === activeTab);
    if (tab && tab.path) {
      fetchData(tab.path);
    } else {
      setData(null);
    }
  }, [activeTab, fetchData, tabs]);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-sm">
        <div className="flex items-center gap-6">
          <Button variant="outline" onClick={onBack} className="w-10 h-10 p-0 rounded-xl">
            <ChevronRight className="rotate-180" size={20} />
          </Button>
          <div className="w-px h-10 bg-zinc-100" />
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-zinc-900 tracking-tight">{router.name}</h3>
              <div className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest",
                router.status === 'online' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
              )}>
                {router.status}
              </div>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">{router.url}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Last Sync</p>
            <p className="text-xs font-bold text-zinc-400 italic">Live data in Phase 4</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => {
            const tab = tabs.find(t => t.id === activeTab);
            if (tab && tab.path) fetchData(tab.path);
          }}>
            <RefreshCcw size={14} className={cn(loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="flex gap-2 bg-zinc-100/50 p-1.5 rounded-2xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all",
              activeTab === tab.id
                ? "bg-white text-zinc-900 shadow-md"
                : "text-zinc-500 hover:text-zinc-900"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeTab === 'terminal' ? (
          <ConfigTerminal routers={[router]} token={token} />
        ) : (
          <Card className="p-0 overflow-hidden bg-zinc-900 border-zinc-800 shadow-2xl">
            <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-zinc-700" />
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                  Path: {tabs.find(t => t.id === activeTab)?.path?.join(' / ')}
                </span>
              </div>
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500/20" />
                <div className="w-2 h-2 rounded-full bg-amber-500/20" />
                <div className="w-2 h-2 rounded-full bg-emerald-500/20" />
              </div>
            </div>
            <div className="p-8 min-h-[500px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-96 gap-6">
                  <div className="relative">
                    <Activity className="animate-spin text-zinc-700" size={48} />
                    <div className="absolute inset-0 animate-ping bg-zinc-700/10 rounded-full" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-zinc-400">Synchronizing State</p>
                    <p className="text-xs text-zinc-600 mt-1">Retrieving configuration from edge node...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-96 gap-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                    <AlertCircle className="text-red-500" size={32} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">Connection Interrupted</p>
                    <p className="text-sm text-zinc-500 mt-2 max-w-sm mx-auto">{error}</p>
                  </div>
                  <Button variant="outline" className="text-white border-zinc-700 hover:bg-zinc-800" onClick={() => {
                    const tab = tabs.find(t => t.id === activeTab);
                    if (tab && tab.path) fetchData(tab.path);
                  }}>Re-establish Connection</Button>
                </div>
              ) : (
                <div className="max-h-[700px] overflow-y-auto custom-scrollbar pr-4">
                  <ConfigNode data={data} path={tabs.find(t => t.id === activeTab)?.path || []} routerId={router.id} token={token} />
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </motion.div>
  );
}

