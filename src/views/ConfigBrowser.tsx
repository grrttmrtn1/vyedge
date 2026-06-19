import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Trash2,
  Edit,
  Plus,
  RefreshCcw,
  FileText,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import type { Router } from '../types';

interface ConfigBrowserProps {
  routers: Router[];
  token: string;
}

export function ConfigBrowser({ routers, token }: ConfigBrowserProps) {
  const [selectedRouter, setSelectedRouter] = useState<string | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/vyos/${id}/show`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ data: { op: 'showConfig', path: [] } })
      });
      const result = await res.json();
      if (res.ok) {
        setConfig(result.data);
      } else {
        setError(result.error || "Failed to fetch config");
      }
    } catch {
      setError("Communication error");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (selectedRouter) fetchConfig(selectedRouter);
  }, [selectedRouter, fetchConfig]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-zinc-900">Configuration Browser</h3>
          <p className="text-sm text-zinc-500">Explore and manage the full VyOS configuration tree.</p>
        </div>
        <div className="w-64">
          <select
            className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm"
            value={selectedRouter || ''}
            onChange={e => setSelectedRouter(e.target.value)}
          >
            <option value="">Select Router...</option>
            {routers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Activity className="animate-spin text-zinc-400" size={32} />
        </div>
      )}

      {error && (
        <Card className="p-8 text-center text-red-500">
          <AlertCircle className="mx-auto mb-2" />
          <p className="text-sm font-medium">{error}</p>
        </Card>
      )}

      {config && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card title="Configuration Tree" className="p-0 overflow-hidden">
              <div className="max-h-[700px] overflow-y-auto p-4 bg-zinc-900">
                <ConfigNode data={config} path={[]} routerId={selectedRouter!} token={token} />
              </div>
            </Card>
          </div>
          <div className="space-y-6">
            <Card title="Quick Actions">
              <div className="space-y-2">
                <Button variant="secondary" className="w-full justify-start" onClick={() => fetchConfig(selectedRouter!)}>
                  <RefreshCcw size={14} className="mr-2" /> Refresh Tree
                </Button>
                <Button variant="secondary" className="w-full justify-start">
                  <FileText size={14} className="mr-2" /> Export JSON
                </Button>
              </div>
            </Card>
            <Card title="Help">
              <p className="text-xs text-zinc-500 leading-relaxed">
                This browser allows you to navigate the entire VyOS configuration.
                Nodes with values can be edited directly. Changes are applied immediately to the router.
              </p>
            </Card>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function ConfigNode({ data, path, routerId, token }: { data: any; path: string[]; routerId: string; token: string }) {
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
