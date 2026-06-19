import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Lock,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import type { User, RouterGroup } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface UsersProps {
  token: string;
  currentUser: User;
  groups: RouterGroup[];
  onRefreshRouters: () => void;
  onRefreshGroups: () => void;
}

export function Users({ token, currentUser, groups, onRefreshRouters, onRefreshGroups }: UsersProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role: 'operator' as 'admin' | 'operator' | 'read-only' });
  const [groupForm, setGroupForm] = useState({ name: '' });
  const [resettingPassword, setResettingPassword] = useState<{ id: string; username: string } | null>(null);
  const [assigningGroups, setAssigningGroups] = useState<{ id: string; username: string } | null>(null);
  const [userGroups, setUserGroups] = useState<string[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteUser, setPendingDeleteUser] = useState<string | null>(null);
  const [pendingDeleteGroupAdmin, setPendingDeleteGroupAdmin] = useState<string | null>(null);

  const handleFetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
      setUsers(await res.json());
      onRefreshGroups();
    } catch {
      console.error("Failed to fetch data");
    }
  }, [token, onRefreshGroups]);

  useEffect(() => {
    const init = async () => {
      await handleFetchData();
    };
    init();
  }, [handleFetchData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      setShowAdd(false);
      setForm({ username: '', password: '', role: 'operator' });
      handleFetchData();
    } else {
      const data = await res.json();
      setError(data.error);
    }
  };

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/router-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(groupForm)
    });
    setGroupForm({ name: '' });
    handleFetchData();
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingPassword) return;
    setError(null);
    const res = await fetch(`/api/users/${resettingPassword.id}/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ password: newPassword })
    });
    if (res.ok) {
      setResettingPassword(null);
      setNewPassword('');
      alert("Password updated successfully");
    } else {
      const data = await res.json();
      setError(data.error);
    }
  };

  const handleAssignGroups = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningGroups) return;
    const res = await fetch(`/api/users/${assigningGroups.id}/groups`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ groupIds: userGroups })
    });
    if (res.ok) {
      setAssigningGroups(null);
      setUserGroups([]);
      alert("Group assignments updated");
    }
  };

  const openAssignGroups = async (user: User) => {
    setAssigningGroups({ id: user.id, username: user.username });
    setError(null);
    try {
      const res = await fetch(`/api/users/${user.id}/groups`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setUserGroups(data);
      } else {
        setError(data.error);
      }
    } catch {
      setError("Failed to fetch user groups");
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
          onRefreshRouters();
        }, 300);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete group");
      }
    } catch {
      alert("Network error: Could not connect to server.");
    }
  };

  const handleDeleteUser = async (id: string) => {
    await fetch(`/api/users/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    handleFetchData();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-zinc-900">User Administration</h3>
          <p className="text-sm text-zinc-500">Manage administrative access and roles.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowGroups(!showGroups)}>
            <Layers size={16} /> {showGroups ? 'View Users' : 'Manage Groups'}
          </Button>
          <Button onClick={() => setShowAdd(true)}><Plus size={16} /> Add User</Button>
        </div>
      </div>

      {showAdd && (
        <Card className="p-6 bg-zinc-50">
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
            <div className="space-y-1">
              <Input label="Username" value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="j.doe" />
            </div>
            <div className="space-y-1">
              <Input label="Password" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••••" />
              <p className="text-[9px] text-zinc-400 leading-tight">Min 8 chars, 1 upper, 1 lower, 1 number, 1 special</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-600">Role</label>
              <select
                value={form.role}
                onChange={e => setForm({...form, role: e.target.value as 'admin' | 'operator' | 'read-only'})}
                className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm h-[38px] focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition-all"
              >
                <option value="operator">Operator</option>
                <option value="admin">Administrator</option>
                <option value="read-only">Read-Only</option>
              </select>
            </div>
            <div className="flex gap-2 h-[38px] mt-[22px]">
              <Button type="submit" className="flex-1">Create</Button>
              <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </form>
          {error && <p className="text-xs text-red-500 mt-2 font-medium">{error}</p>}
        </Card>
      )}

      {resettingPassword && (
        <Card className="p-6 bg-zinc-50 border-zinc-900/20">
          <h4 className="text-sm font-bold mb-4">Reset Password for: {resettingPassword.username}</h4>
          <form onSubmit={handleResetPassword} className="flex gap-4 items-start">
            <div className="flex-1 space-y-1">
              <Input label="New Password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              <p className="text-[9px] text-zinc-400">Min 8 chars, 1 upper, 1 lower, 1 number, 1 special</p>
            </div>
            <div className="flex gap-2 pt-5">
              <Button type="submit">Update Password</Button>
              <Button variant="secondary" onClick={() => { setResettingPassword(null); setNewPassword(''); setError(null); }}>Cancel</Button>
            </div>
          </form>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </Card>
      )}

      {assigningGroups && (
        <Card className="p-6 bg-zinc-50 border-zinc-900/20">
          <h4 className="text-sm font-bold mb-4">Assign Groups to: {assigningGroups.username}</h4>
          <form onSubmit={handleAssignGroups} className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {groups.map(g => (
                <label key={g.id} className="flex items-center gap-2 p-3 bg-white border border-zinc-200 rounded-xl cursor-pointer hover:bg-zinc-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={userGroups.includes(g.id)}
                    onChange={e => {
                      if (e.target.checked) setUserGroups([...userGroups, g.id]);
                      else setUserGroups(userGroups.filter(id => id !== g.id));
                    }}
                    className="w-4 h-4 rounded text-zinc-900 focus:ring-zinc-900"
                  />
                  <span className="text-xs font-medium text-zinc-900">{g.name}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setAssigningGroups(null)}>Cancel</Button>
              <Button type="submit">Save Assignments</Button>
            </div>
          </form>
        </Card>
      )}

      {showGroups ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card title="Router Groups">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Active Groups</h3>
              <Button variant="ghost" size="sm" onClick={onRefreshGroups} className="text-zinc-400 hover:text-zinc-900">
                <RefreshCw size={12} className="mr-1" /> Sync
              </Button>
            </div>
            <form onSubmit={handleAddGroup} className="flex gap-2 mb-6">
              <Input value={groupForm.name} onChange={e => setGroupForm({ name: e.target.value })} placeholder="Group Name (e.g. EMEA Edge)" />
              <Button type="submit">Add Group</Button>
            </form>
            <div className="space-y-2">
              {groups.map(g => (
                <div key={g.id} className="flex items-center justify-between p-3 border border-zinc-100 rounded-xl bg-white group">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-zinc-900">{g.name}</span>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">ID: {g.id}</span>
                  </div>
                  <button onClick={() => setPendingDeleteGroupAdmin(g.id)} className="p-2 text-zinc-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {groups.length === 0 && <p className="text-center py-4 text-zinc-400 text-xs">No groups defined</p>}
            </div>
          </Card>
          <Card title="Access Control Policy">
            <div className="space-y-4">
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                <p className="text-xs font-bold text-zinc-900 mb-1">Role-Based Access</p>
                <p className="text-[10px] text-zinc-500 leading-relaxed">
                  Operators and Read-Only users are restricted to the router groups assigned to them.
                  Administrators have global access to all infrastructure within the tenant.
                </p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <p className="text-xs font-bold text-emerald-900 mb-1">Granular Permissions</p>
                <p className="text-[10px] text-emerald-700 leading-relaxed">
                  Use the <Layers size={10} className="inline" /> icon in the user list to manage group-level isolation for each operator.
                </p>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-0">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Username</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Role</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Groups</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {users.map(u => (
                <tr key={u.id}>
                  <td className="px-6 py-4 text-sm font-medium">{u.username}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      u.role === 'admin' ? "bg-zinc-900 text-white" :
                      u.role === 'read-only' ? "bg-blue-100 text-blue-700" : "bg-zinc-100 text-zinc-600"
                    )}>{u.role}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {u.role === 'admin' ? (
                        <span className="text-[10px] text-zinc-400 italic">Global Access</span>
                      ) : u.groups && u.groups.length > 0 ? (
                        u.groups.map(g => (
                          <span key={g} className="px-2 py-0.5 bg-zinc-50 border border-zinc-100 rounded text-[9px] font-medium text-zinc-600">{g}</span>
                        ))
                      ) : (
                        <span className="text-[10px] text-emerald-500 font-bold italic">Global Access (Default)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Button variant="ghost" className="p-1 h-auto text-zinc-400 hover:text-zinc-900" onClick={() => openAssignGroups(u)}>
                        <Layers size={14} />
                      </Button>
                      <Button variant="ghost" className="p-1 h-auto text-zinc-400 hover:text-zinc-900" onClick={() => setResettingPassword({ id: u.id, username: u.username })}>
                        <Lock size={14} />
                      </Button>
                      {u.id !== currentUser.id && (
                        <button onClick={() => setPendingDeleteUser(u.id)} className="p-1 text-zinc-400 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <ConfirmModal
        open={!!pendingDeleteUser}
        title="Delete User"
        description="This will permanently remove the user and revoke all access. This action cannot be undone."
        confirmLabel="Delete User"
        onConfirm={() => {
          if (pendingDeleteUser) handleDeleteUser(pendingDeleteUser);
          setPendingDeleteUser(null);
        }}
        onCancel={() => setPendingDeleteUser(null)}
      />

      <ConfirmModal
        open={!!pendingDeleteGroupAdmin}
        title="Delete Group"
        description="This will permanently remove the group. Users and routers assigned to this group will be unassigned. This action cannot be undone."
        confirmLabel="Delete Group"
        onConfirm={() => {
          if (pendingDeleteGroupAdmin) handleDeleteGroup(pendingDeleteGroupAdmin);
          setPendingDeleteGroupAdmin(null);
        }}
        onCancel={() => setPendingDeleteGroupAdmin(null)}
      />
    </motion.div>
  );
}
