import React, { useState } from 'react';
import {
  Activity,
  ChevronRight,
  Edit,
  Layers,
  RefreshCw,
  Server,
  Terminal as TerminalIcon,
  Trash2,
  Plus,
} from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import type { Router, RouterGroup, User } from '../types';
import { useRouterMetrics } from '../hooks/useRouterMetrics';
import { apiFetch } from '../api/client';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function DetailItem({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

function RouterCardMetrics({ routerId, token }: { routerId: string; token: string }) {
  const { latest } = useRouterMetrics(routerId, token);

  return (
    <div className="mt-6 grid grid-cols-2 gap-4">
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 dark:bg-slate-700 dark:border-slate-700">
        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">CPU Load</p>
        {latest?.cpu != null ? (
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{latest.cpu.loadPercent}%</p>
        ) : (
          <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded animate-pulse w-12" />
        )}
      </div>
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 dark:bg-slate-700 dark:border-slate-700">
        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Uptime</p>
        {latest?.uptime?.str ? (
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{latest.uptime.str}</p>
        ) : (
          <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded animate-pulse w-16" />
        )}
      </div>
    </div>
  );
}

interface FleetProps {
  routers: Router[];
  groups: RouterGroup[];
  onRefresh: () => void;
  onRefreshGroups: () => void;
  token: string;
  onManage: (router: Router) => void;
  currentUser: User;
}

export function Fleet({ routers, groups, onRefresh, onRefreshGroups, token, onManage, currentUser }: FleetProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState<Router | null>(null);
  const [showManageGroups, setShowManageGroups] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', api_key: '', group_id: '' });
  const [editForm, setEditForm] = useState({ name: '', url: '', api_key: '', group_id: '' });
  const [groupForm, setGroupForm] = useState({ name: '' });
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState<string | null>(null);
  const [selectedRouter, setSelectedRouter] = useState<Router | null>(null);
  const [pendingDeleteRouter, setPendingDeleteRouter] = useState<string | null>(null);
  const [pendingDeleteGroup, setPendingDeleteGroup] = useState<string | null>(null);
  const [activeGroupFilter, setActiveGroupFilter] = useState<string>('all');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name || !form.url || !form.api_key) {
      setError("All fields are required");
      return;
    }

    if (!form.url.startsWith('https://')) {
      setError("URL must start with https://");
      return;
    }

    // IP/Hostname validation
    try {
      const urlObj = new URL(form.url);
      if (!urlObj.hostname) throw new Error();
    } catch (e) {
      setError("Invalid URL format. Use https://IP_OR_HOSTNAME");
      return;
    }

    try {
      const res = await fetch('/api/routers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        setShowAdd(false);
        setForm({ name: '', url: '', api_key: '', group_id: '' });
        onRefresh();
      } else {
        setError(data.error);
      }
    } catch {
      setError("Failed to add router");
    }
  };

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm.name) return;
    const res = await fetch('/api/router-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(groupForm)
    });
    if (res.ok) {
      setGroupForm({ name: '' });
      onRefreshGroups();
    } else {
      const data = await res.json();
      alert(data.error);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    try {
      const res = await fetch(`/api/router-groups/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setTimeout(() => {
          onRefreshGroups();
          onRefresh();
        }, 300);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete group. Please check server logs.");
      }
    } catch {
      alert("Network error: Could not connect to management server.");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEdit) return;
    setError(null);

    if (editForm.url && !editForm.url.startsWith('https://')) {
      setError("URL must start with https://");
      return;
    }

    if (editForm.url) {
      try {
        const urlObj = new URL(editForm.url);
        if (!urlObj.hostname) throw new Error();
      } catch (e) {
        setError("Invalid URL format. Use https://IP_OR_HOSTNAME");
        return;
      }
    }

    try {
      const res = await fetch(`/api/routers/${showEdit.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (res.ok) {
        setShowEdit(null);
        onRefresh();
      } else {
        setError(data.error);
      }
    } catch {
      setError("Failed to update router");
    }
  };

  const openEdit = (router: Router) => {
    setShowEdit(router);
    setEditForm({
      name: router.name,
      url: router.url,
      api_key: '', // Don't show existing key for security
      group_id: router.group_id || ''
    });
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/routers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        onRefresh();
        if (selectedRouter?.id === id) setSelectedRouter(null);
      } else {
        alert(data.error || "Failed to delete router");
      }
    } catch {
      alert("Network error: Failed to delete router");
    }
  };

  const checkStatus = async (id: string) => {
    setChecking(id);
    try {
      await fetch(`/api/routers/${id}/check`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      onRefresh();
    } finally {
      setChecking(null);
    }
  };

  const filteredRouters = activeGroupFilter === 'all'
    ? routers
    : routers.filter(r => r.group_id === activeGroupFilter);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Router Fleet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage your VyOS instances across all tenants.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowManageGroups(!showManageGroups)}>
            <Layers size={16} />
            {showManageGroups ? 'View Routers' : 'Manage Groups'}
          </Button>
          <Button variant="secondary" onClick={() => routers.forEach(r => checkStatus(r.id))}>
            <Activity size={16} />
            Refresh All Status
          </Button>
          <Button onClick={() => setShowAdd(true)}>
            <Plus size={16} />
            Add Router
          </Button>
        </div>
      </div>

      {/* Group filter tabs */}
      {groups.length > 0 && !showManageGroups && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveGroupFilter('all')}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all",
              activeGroupFilter === 'all'
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:border-indigo-500"
            )}
          >
            All ({routers.length})
          </button>
          {groups.map(g => (
            <button
              key={g.id}
              onClick={() => setActiveGroupFilter(g.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all",
                activeGroupFilter === g.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:border-indigo-500"
              )}
            >
              {g.name} ({routers.filter(r => r.group_id === g.id).length})
            </button>
          ))}
        </div>
      )}

      {showAdd && (
        <Card className="p-6 border-slate-900/10 bg-slate-50/50 dark:bg-slate-800/50">
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Edge-01" />
              <Input label="API URL" value={form.url} onChange={e => setForm({...form, url: e.target.value})} placeholder="https://10.0.0.1" />
              <Input label="API Key" type="password" value={form.api_key} onChange={e => setForm({...form, api_key: e.target.value})} placeholder="••••••••" />
              <Select
                label="Group"
                value={form.group_id}
                onChange={e => setForm({...form, group_id: e.target.value})}
                options={groups.map(g => ({ value: g.id, label: g.name }))}
                placeholder="No Group"
              />
            </div>
            {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit">Save Router</Button>
            </div>
          </form>
        </Card>
      )}

      {showEdit && (
        <Card className="p-6 border-slate-900/10 bg-slate-50/50 dark:bg-slate-800/50">
          <h4 className="text-sm font-bold mb-4 dark:text-slate-100">Edit Router: {showEdit.name}</h4>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Name" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Edge-01" />
              <Input label="API URL" value={editForm.url} onChange={e => setEditForm({...editForm, url: e.target.value})} placeholder="https://10.0.0.1" />
              <Input label="API Key (Leave blank to keep current)" type="password" value={editForm.api_key} onChange={e => setEditForm({...editForm, api_key: e.target.value})} placeholder="••••••••" />
              <Select
                label="Group"
                value={editForm.group_id}
                onChange={e => setEditForm({...editForm, group_id: e.target.value})}
                options={groups.map(g => ({ value: g.id, label: g.name }))}
                placeholder="No Group"
              />
            </div>
            {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setShowEdit(null)}>Cancel</Button>
              <Button type="submit">Update Router</Button>
            </div>
          </form>
        </Card>
      )}

      {showManageGroups ? (
        <Card title="Infrastructure Groups" subtitle="Logical isolation for edge nodes">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">Manage Groups</h3>
              <Button variant="outline" size="sm" onClick={onRefreshGroups}>
                <RefreshCw size={12} className="mr-1" /> Refresh
              </Button>
            </div>
            <form onSubmit={handleAddGroup} className="flex gap-3">
              <input
                value={groupForm.name}
                onChange={e => setGroupForm({ name: e.target.value })}
                placeholder="New Group Name (e.g. US-EAST-1)"
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:focus:bg-slate-600 dark:placeholder:text-slate-400"
              />
              <Button type="submit">Create Group</Button>
            </form>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map(g => (
                <div key={g.id} className="flex items-center justify-between p-5 border border-slate-100 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all group dark:bg-slate-800 dark:border-slate-700">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-50">{g.name}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">ID: {g.id} • {g.node_count || 0} Nodes</p>
                  </div>
                  {currentUser.role === 'admin' && (
                    <button onClick={() => setPendingDeleteGroup(g.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              {groups.length === 0 && <p className="text-center py-12 text-slate-400 text-xs col-span-full font-medium italic">No infrastructure groups defined.</p>}
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredRouters.map(router => (
            <Card key={router.id} className={cn(
              "group transition-all relative border-l-4",
              router.status === 'online' ? "border-l-emerald-500" :
              router.status === 'offline' ? "border-l-rose-500" : "border-l-amber-400",
              selectedRouter?.id === router.id && "ring-2 ring-indigo-500"
            )}>
              <div className="flex items-start justify-between mb-6">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                  router.status === 'online' ? "bg-emerald-50 text-emerald-700" :
                  router.status === 'offline' ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
                )}>
                  <Server size={24} />
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="p-2 h-auto" onClick={() => checkStatus(router.id)} disabled={checking === router.id}>
                    <Activity size={14} className={cn(checking === router.id && "animate-spin")} />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-2 h-auto" onClick={() => openEdit(router)}>
                    <Edit size={14} className="text-slate-400 hover:text-slate-900 transition-colors" />
                  </Button>
                  <button onClick={() => setPendingDeleteRouter(router.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-50 tracking-tight">{router.name}</h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-wider">{router.url}</p>
              </div>

              <RouterCardMetrics routerId={router.id} token={token} />

              <div className="mt-6 flex items-center gap-3">
                <Button variant="primary" size="sm" className="flex-1 h-10 rounded-xl" onClick={() => onManage(router)}>
                  <TerminalIcon size={14} /> Console
                </Button>
                <Button variant="outline" size="sm" className="h-10 w-10 p-0 rounded-xl" onClick={() => setSelectedRouter(router)}>
                  <ChevronRight size={16} />
                </Button>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    router.status === 'online' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                    router.status === 'offline' ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]" : "bg-slate-300"
                  )} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">{router.status}</span>
                  {router.vyos_version && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600">
                      {router.vyos_version}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">VyOS</span>
                  <button
                    onClick={async () => {
                      await apiFetch(`/api/routers/${router.id}/detect-version`, { method: 'POST' });
                      onRefresh();
                    }}
                    className="text-[10px] text-slate-400 hover:text-indigo-500 transition-colors"
                    title="Re-detect VyOS version"
                  >
                    Re-detect
                  </button>
                </div>
              </div>
            </Card>
          ))}
          {routers.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-500 mb-4">
                <Server size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">No edge nodes found</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mt-1">Start by adding your first VyOS instance to the management fleet.</p>
              <Button onClick={() => setShowAdd(true)} className="mt-6">Add First Router</Button>
            </div>
          )}
          {routers.length > 0 && filteredRouters.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No routers in this group</p>
            </div>
          )}
        </div>
      )}

      {selectedRouter && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card title={`Router Details: ${selectedRouter.name}`} className="bg-slate-50 dark:bg-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <DetailItem label="ID" value={selectedRouter.id} />
                <DetailItem label="Name" value={selectedRouter.name} />
                <DetailItem label="URL" value={selectedRouter.url} />
                <DetailItem label="Group ID" value={selectedRouter.group_id || 'None'} />
              </div>
              <div className="space-y-4">
                <DetailItem label="Status" value={selectedRouter.status} />
                <div className="pt-4">
                  <Button variant="secondary" className="w-full" onClick={() => setSelectedRouter(null)}>Close Details</Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      <ConfirmModal
        open={!!pendingDeleteRouter}
        title="Delete Router"
        description="This will permanently remove the router from your fleet. This action cannot be undone."
        confirmLabel="Delete Router"
        onConfirm={() => {
          if (pendingDeleteRouter) handleDelete(pendingDeleteRouter);
          setPendingDeleteRouter(null);
        }}
        onCancel={() => setPendingDeleteRouter(null)}
      />

      <ConfirmModal
        open={!!pendingDeleteGroup}
        title="Delete Group"
        description="This will permanently remove the group. Routers in this group will be unassigned. This action cannot be undone."
        confirmLabel="Delete Group"
        onConfirm={() => {
          if (pendingDeleteGroup) handleDeleteGroup(pendingDeleteGroup);
          setPendingDeleteGroup(null);
        }}
        onCancel={() => setPendingDeleteGroup(null)}
      />
    </motion.div>
  );
}
