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
import { ConfirmModal } from '../components/ui/ConfirmModal';
import type { Router, RouterGroup, User } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function DetailItem({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-medium text-zinc-900">{value}</p>
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-zinc-900">Router Fleet</h3>
          <p className="text-sm text-zinc-500">Manage your VyOS instances across all tenants.</p>
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

      {showAdd && (
        <Card className="p-6 border-zinc-900/10 bg-zinc-50/50">
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Edge-01" />
              <Input label="API URL" value={form.url} onChange={e => setForm({...form, url: e.target.value})} placeholder="https://10.0.0.1" />
              <Input label="API Key" type="password" value={form.api_key} onChange={e => setForm({...form, api_key: e.target.value})} placeholder="••••••••" />
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-600">Group</label>
                <select
                  value={form.group_id}
                  onChange={e => setForm({...form, group_id: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm"
                >
                  <option value="">No Group</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            </div>
            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit">Save Router</Button>
            </div>
          </form>
        </Card>
      )}

      {showEdit && (
        <Card className="p-6 border-zinc-900/10 bg-zinc-50/50">
          <h4 className="text-sm font-bold mb-4">Edit Router: {showEdit.name}</h4>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Name" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Edge-01" />
              <Input label="API URL" value={editForm.url} onChange={e => setEditForm({...editForm, url: e.target.value})} placeholder="https://10.0.0.1" />
              <Input label="API Key (Leave blank to keep current)" type="password" value={editForm.api_key} onChange={e => setEditForm({...editForm, api_key: e.target.value})} placeholder="••••••••" />
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-600">Group</label>
                <select
                  value={editForm.group_id}
                  onChange={e => setEditForm({...editForm, group_id: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm"
                >
                  <option value="">No Group</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            </div>
            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
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
              <h3 className="text-sm font-bold text-zinc-900">Manage Groups</h3>
              <Button variant="outline" size="sm" onClick={onRefreshGroups}>
                <RefreshCw size={12} className="mr-1" /> Refresh
              </Button>
            </div>
            <form onSubmit={handleAddGroup} className="flex gap-3">
              <input
                value={groupForm.name}
                onChange={e => setGroupForm({ name: e.target.value })}
                placeholder="New Group Name (e.g. US-EAST-1)"
                className="flex-1 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:bg-white focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
              />
              <Button type="submit">Create Group</Button>
            </form>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map(g => (
                <div key={g.id} className="flex items-center justify-between p-5 border border-zinc-100 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all group">
                  <div>
                    <p className="text-sm font-bold text-zinc-900">{g.name}</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">ID: {g.id} • {g.node_count || 0} Nodes</p>
                  </div>
                  {currentUser.role === 'admin' && (
                    <button onClick={() => setPendingDeleteGroup(g.id)} className="p-2 text-zinc-300 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              {groups.length === 0 && <p className="text-center py-12 text-zinc-400 text-xs col-span-full font-medium italic">No infrastructure groups defined.</p>}
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {routers.map(router => (
            <Card key={router.id} className={cn("group transition-all relative", selectedRouter?.id === router.id && "ring-2 ring-zinc-900")}>
              <div className="flex items-start justify-between mb-6">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                  router.status === 'online' ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-400"
                )}>
                  <Server size={24} />
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="p-2 h-auto" onClick={() => checkStatus(router.id)} disabled={checking === router.id}>
                    <Activity size={14} className={cn(checking === router.id && "animate-spin")} />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-2 h-auto" onClick={() => openEdit(router)}>
                    <Edit size={14} className="text-zinc-400 hover:text-zinc-900 transition-colors" />
                  </Button>
                  <button onClick={() => setPendingDeleteRouter(router.id)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-bold text-zinc-900 tracking-tight">{router.name}</h4>
                <p className="text-[10px] text-zinc-400 font-mono tracking-wider">{router.url}</p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">CPU Load</p>
                  <div className="h-4 bg-zinc-200 rounded animate-pulse w-12" />
                </div>
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Uptime</p>
                  <div className="h-4 bg-zinc-200 rounded animate-pulse w-16" />
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <Button variant="primary" size="sm" className="flex-1 h-10 rounded-xl" onClick={() => onManage(router)}>
                  <TerminalIcon size={14} /> Console
                </Button>
                <Button variant="outline" size="sm" className="h-10 w-10 p-0 rounded-xl" onClick={() => setSelectedRouter(router)}>
                  <ChevronRight size={16} />
                </Button>
              </div>

              <div className="mt-6 pt-6 border-t border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    router.status === 'online' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                    router.status === 'offline' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-zinc-300"
                  )} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">{router.status}</span>
                </div>
                <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">VyOS</span>
              </div>
            </Card>
          ))}
          {routers.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300 mb-4">
                <Server size={32} />
              </div>
              <h3 className="text-lg font-bold text-zinc-900">No edge nodes found</h3>
              <p className="text-sm text-zinc-500 max-w-xs mt-1">Start by adding your first VyOS instance to the management fleet.</p>
              <Button onClick={() => setShowAdd(true)} className="mt-6">Add First Router</Button>
            </div>
          )}
        </div>
      )}

      {selectedRouter && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card title={`Router Details: ${selectedRouter.name}`} className="bg-zinc-50">
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
