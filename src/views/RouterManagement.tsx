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
  ChevronDown,
  RefreshCcw,
  Activity,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit,
  Plus,
  Terminal,
} from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import type { Router } from '../types';

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
          <ConfigView routers={[router]} token={token} />
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

// ---------------------------------------------------------------------------
// ConfigNode and ConfigView are temporary local copies pending Task 10, which
// will extract them into src/views/ConfigBrowser.tsx and
// src/views/ConfigTerminal.tsx respectively. At that point these copies will
// be deleted and replaced with proper imports.
// ---------------------------------------------------------------------------

function ConfigNode({ data, path, routerId, token }: { data: any; path: string[]; routerId: string; token: string }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const toggle = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async (key: string, value: string) => {
    const newPath = [...path, key];
    try {
      const res = await fetch(`/api/vyos/${routerId}/configure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          data: {
            op: 'set',
            path: newPath,
            value: value
          }
        })
      });
      if (res.ok) {
        setEditing(null);
        setAdding(false);
        setNewKey('');
        setNewValue('');
      } else {
        const err = await res.json();
        alert(err.details || "Failed to set value");
      }
    } catch (e) {
      alert("Communication error");
    }
  };

  if (typeof data !== 'object' || data === null) {
    return <span className="text-emerald-400 font-mono text-xs">{String(data)}</span>;
  }

  return (
    <div className="space-y-1 ml-6 border-l border-zinc-800/50 pl-6">
      {Object.entries(data).map(([key, value]) => {
        const isObject = typeof value === 'object' && value !== null;

        return (
          <div key={key} className="group">
            <div className="flex items-center gap-3 py-1 hover:bg-zinc-800/30 rounded-lg px-2 -ml-2 transition-colors">
              {isObject ? (
                <button onClick={() => toggle(key)} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                  {expanded[key] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              ) : (
                <div className="w-3.5" />
              )}

              <span className="text-zinc-500 font-mono text-xs font-bold">{key}</span>
              <span className="text-zinc-700 font-mono text-xs">:</span>

              {!isObject && (
                <div className="flex items-center gap-3">
                  {editing === key ? (
                    <div className="flex items-center gap-2">
                      <input
                        className="bg-zinc-800 text-white text-xs px-2 py-1 rounded-md border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-48"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        autoFocus
                      />
                      <button onClick={() => handleSave(key, editValue)} className="text-emerald-500 hover:text-emerald-400 transition-colors"><CheckCircle2 size={14} /></button>
                      <button onClick={() => setEditing(null)} className="text-zinc-500 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 font-mono text-xs bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">{String(value)}</span>
                      <button
                        onClick={() => { setEditing(key); setEditValue(String(value)); }}
                        className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-300 transition-all"
                      >
                        <Edit size={12} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {isObject && expanded[key] && (
              <ConfigNode data={value} path={[...path, key]} routerId={routerId} token={token} />
            )}
          </div>
        );
      })}

      <div className="mt-4">
        {adding ? (
          <div className="flex items-center gap-3 py-2 bg-zinc-800/20 rounded-xl px-4 border border-zinc-800/50">
            <input
              placeholder="Key"
              className="bg-zinc-900 text-white text-xs px-2 py-1 rounded-md border border-zinc-700 w-32 focus:outline-none"
              value={newKey}
              onChange={e => setNewKey(e.target.value)}
            />
            <input
              placeholder="Value (optional)"
              className="bg-zinc-900 text-white text-xs px-2 py-1 rounded-md border border-zinc-700 w-48 focus:outline-none"
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
            />
            <button onClick={() => handleSave(newKey, newValue)} className="text-emerald-500 hover:text-emerald-400"><CheckCircle2 size={14} /></button>
            <button onClick={() => setAdding(false)} className="text-red-500 hover:text-red-400"><Trash2 size={14} /></button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="text-[10px] font-bold text-zinc-600 hover:text-zinc-300 flex items-center gap-2 transition-colors uppercase tracking-widest py-2"
          >
            <Plus size={12} /> Add Configuration Node
          </button>
        )}
      </div>
    </div>
  );
}

function ConfigView({ routers, token }: { routers: Router[]; token: string }) {
  const [selectedRouters, setSelectedRouters] = useState<string[]>([]);
  const [command, setCommand] = useState('');
  const [outputs, setOutputs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (routers.length === 1) {
      setSelectedRouters([routers[0].id]);
    }
  }, [routers]);

  const handleExecute = async (action: 'configure' | 'show' | 'op') => {
    if (selectedRouters.length === 0) return alert("Select at least one router");
    if (!command) return alert("Enter a command path");

    setLoading(true);
    setOutputs({});

    const executeOnRouter = async (routerId: string) => {
      try {
        let op = 'set';
        if (action === 'show') op = 'showConfig';
        if (action === 'op') op = 'run';

        const data = {
          op,
          path: command.trim().split(/\s+/)
        };

        const res = await fetch(`/api/vyos/${routerId}/${action}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ data })
        });
        const result = await res.json();
        return { routerId, result };
      } catch (err: any) {
        return { routerId, result: { error: "Execution failed", details: err.message } };
      }
    };

    try {
      const results = await Promise.all(selectedRouters.map(executeOnRouter));
      const newOutputs: Record<number, any> = {};
      results.forEach(r => {
        newOutputs[r.routerId] = r.result;
      });
      setOutputs(newOutputs);
    } finally {
      setLoading(false);
    }
  };

  const toggleRouter = (id: string) => {
    setSelectedRouters(prev =>
      prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-zinc-900">Remote Configuration</h3>
          <p className="text-sm text-zinc-500">Execute commands across your fleet securely.</p>
        </div>
      </div>

      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-600">Target Routers ({selectedRouters.length} selected)</label>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-zinc-100 rounded-lg bg-zinc-50/50">
            {routers.map(r => (
              <button
                key={r.id}
                onClick={() => toggleRouter(r.id)}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border",
                  selectedRouters.includes(r.id)
                    ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                    : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
                )}
              >
                {r.name}
              </button>
            ))}
            {routers.length === 0 && <p className="text-[10px] text-zinc-400 p-2">No routers available</p>}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="text-[10px] p-0 h-auto" onClick={() => setSelectedRouters(routers.map(r => r.id))}>Select All</Button>
            <Button variant="ghost" className="text-[10px] p-0 h-auto" onClick={() => setSelectedRouters([])}>Clear Selection</Button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-600">Quick Templates</label>
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" className="text-[10px] py-1 px-2 h-auto" onClick={() => setCommand('interfaces')}>Interfaces</Button>
            <Button variant="secondary" className="text-[10px] py-1 px-2 h-auto" onClick={() => setCommand('system ntp')}>NTP</Button>
            <Button variant="secondary" className="text-[10px] py-1 px-2 h-auto" onClick={() => setCommand('protocols static')}>Static</Button>
            <Button variant="secondary" className="text-[10px] py-1 px-2 h-auto" onClick={() => setCommand('show interfaces')}>Show Ints</Button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-600">Command Path (Space separated)</label>
          <div className="relative">
            <Terminal className="absolute left-3 top-3 text-zinc-400" size={16} />
            <textarea
              value={command}
              onChange={e => setCommand(e.target.value)}
              placeholder="interfaces ethernet eth0 address 192.168.1.1/24"
              className="w-full pl-10 pr-4 py-3 bg-zinc-900 text-zinc-100 font-mono text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-500/20 min-h-[100px]"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={() => handleExecute('show')} disabled={loading} variant="secondary">
            {loading ? 'Executing...' : 'Show Config'}
          </Button>
          <Button onClick={() => handleExecute('configure')} disabled={loading}>
            {loading ? 'Executing...' : 'Set Configuration'}
          </Button>
          <Button onClick={() => handleExecute('op')} disabled={loading} variant="ghost">
            {loading ? 'Executing...' : 'Operational Cmd'}
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        {Object.entries(outputs).map(([routerId, output]) => {
          const router = routers.find(r => r.id === routerId);
          return (
            <Card key={routerId} title={`Output: ${router?.name || routerId}`} className="bg-zinc-900 border-zinc-800">
              <div className="max-h-[300px] overflow-y-auto">
                <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap">
                  {typeof output === 'string' ? output : JSON.stringify(output, null, 2)}
                </pre>
              </div>
            </Card>
          );
        })}
      </div>
    </motion.div>
  );
}
