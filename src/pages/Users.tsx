import React, { useEffect, useState } from 'react';
import { Card, Button, Input, Badge, Select } from '../components/UI';
import { Users as UsersIcon, Plus, Trash2, Search, AlertCircle, RefreshCcw, Lock } from 'lucide-react';
import { User } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    username: '',
    password: '',
    role: 'operator' as 'admin' | 'operator' | 'read-only'
  });
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const token = localStorage.getItem('nexus_token');
    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const token = localStorage.getItem('nexus_token');
    try {
      const res = await fetch('/api/users', {
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
        setForm({ username: '', password: '', role: 'operator' });
        fetchUsers();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to connect to server");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this user?")) return;
    const token = localStorage.getItem('nexus_token');
    const res = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error);
    }
    fetchUsers();
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">User Administration</h1>
          <p className="text-sm text-zinc-500">Manage administrative access, roles, and security permissions.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchUsers}>
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
          <Button onClick={() => setShowAdd(!showAdd)}>
            <Plus size={16} />
            {showAdd ? 'Cancel' : 'Add User'}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card title="Add New Administrative User" subtitle="Assign roles and set initial credentials">
              <form onSubmit={handleAdd} className="space-y-6">
                {/* Aligned Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                  <Input 
                    label="Username" 
                    placeholder="j.doe" 
                    value={form.username}
                    onChange={e => setForm({...form, username: e.target.value})}
                  />
                  <Input 
                    label="Initial Password" 
                    type="password"
                    placeholder="••••••••••••" 
                    value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                  />
                  <Select 
                    label="System Role" 
                    value={form.role}
                    onChange={e => setForm({...form, role: e.target.value as any})}
                    options={[
                      { value: 'admin', label: 'Administrator' },
                      { value: 'operator', label: 'Operator' },
                      { value: 'read-only', label: 'Read-Only' }
                    ]}
                  />
                </div>
                {error && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-xs font-bold uppercase tracking-tight">
                    <AlertCircle size={14} />
                    {error}
                  </div>
                )}
                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                  <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
                  <Button type="submit">Create User Account</Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/30">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-white border border-zinc-200 rounded-full text-xs focus:ring-2 focus:ring-zinc-900/5 transition-all w-full"
            />
          </div>
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            {filteredUsers.length} Users Total
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">User</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Role</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Tenant</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-zinc-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500">
                        <UsersIcon size={18} />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-zinc-900">{user.username}</span>
                        <p className="text-[10px] text-zinc-400 font-mono">ID: {user.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={user.role === 'admin' ? 'success' : user.role === 'operator' ? 'info' : 'neutral'}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Default</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all">
                        <Lock size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(user.id)}
                        className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
