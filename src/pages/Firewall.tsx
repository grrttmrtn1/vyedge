import React, { useEffect, useState } from 'react';
import { Card, Button, Input, Badge, Select } from '../components/UI';
import { Shield, Plus, Trash2, Search, AlertCircle, RefreshCcw } from 'lucide-react';
import { FirewallRule } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export const Firewall: React.FC = () => {
  const [rules, setRules] = useState<FirewallRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    action: 'accept' as 'accept' | 'drop' | 'reject',
    protocol: 'all',
    source_address: '',
    source_port: '',
    destination_address: '',
    destination_port: '',
    description: ''
  });
  const [error, setError] = useState<string | null>(null);

  const fetchRules = async () => {
    setLoading(true);
    const token = localStorage.getItem('nexus_token');
    try {
      const res = await fetch('/api/firewall', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setRules(data);
    } catch (err) {
      console.error("Failed to fetch firewall rules", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const token = localStorage.getItem('nexus_token');
    try {
      const res = await fetch('/api/firewall', {
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
        setForm({
          action: 'accept',
          protocol: 'all',
          source_address: '',
          source_port: '',
          destination_address: '',
          destination_port: '',
          description: ''
        });
        fetchRules();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to connect to server");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this firewall rule?")) return;
    const token = localStorage.getItem('nexus_token');
    await fetch(`/api/firewall/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchRules();
  };

  const filteredRules = rules.filter(r => 
    r.source_address?.includes(search) || 
    r.destination_address?.includes(search) || 
    r.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Firewall Policies</h1>
          <p className="text-sm text-zinc-500">Define ingress and egress security rules for your network.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchRules}>
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
          <Button onClick={() => setShowAdd(!showAdd)}>
            <Plus size={16} />
            {showAdd ? 'Cancel' : 'Add Rule'}
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
            <Card title="New Firewall Rule" subtitle="Configure traffic filtering parameters">
              <form onSubmit={handleAdd} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Select 
                    label="Action" 
                    value={form.action}
                    onChange={e => setForm({...form, action: e.target.value as any})}
                    options={[
                      { value: 'accept', label: 'Accept' },
                      { value: 'drop', label: 'Drop' },
                      { value: 'reject', label: 'Reject' }
                    ]}
                  />
                  <Input 
                    label="Protocol" 
                    placeholder="tcp, udp, icmp, all" 
                    value={form.protocol}
                    onChange={e => setForm({...form, protocol: e.target.value})}
                  />
                  <Input 
                    label="Description" 
                    placeholder="Allow SSH from Admin LAN" 
                    value={form.description}
                    onChange={e => setForm({...form, description: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Input 
                    label="Source Address" 
                    placeholder="10.0.0.0/24" 
                    value={form.source_address}
                    onChange={e => setForm({...form, source_address: e.target.value})}
                  />
                  <Input 
                    label="Source Port" 
                    placeholder="Any" 
                    value={form.source_port}
                    onChange={e => setForm({...form, source_port: e.target.value})}
                  />
                  <Input 
                    label="Destination Address" 
                    placeholder="0.0.0.0/0" 
                    value={form.destination_address}
                    onChange={e => setForm({...form, destination_address: e.target.value})}
                  />
                  <Input 
                    label="Destination Port" 
                    placeholder="22, 80, 443" 
                    value={form.destination_port}
                    onChange={e => setForm({...form, destination_port: e.target.value})}
                  />
                </div>
                {error && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-xs font-bold uppercase tracking-tight">
                    <AlertCircle size={14} />
                    {error}
                  </div>
                )}
                <div className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
                  <Button type="submit">Create Rule</Button>
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
              placeholder="Search rules..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-white border border-zinc-200 rounded-full text-xs focus:ring-2 focus:ring-zinc-900/5 transition-all w-full"
            />
          </div>
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            {filteredRules.length} Rules Total
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Action</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Protocol</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Source</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Destination</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Description</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredRules.map(rule => (
                <tr key={rule.id} className="hover:bg-zinc-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <Badge variant={rule.action === 'accept' ? 'success' : rule.action === 'drop' ? 'danger' : 'warning'}>
                      {rule.action}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">{rule.protocol}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-zinc-900">{rule.source_address || 'Any'}</div>
                    <div className="text-[10px] font-mono text-zinc-400">Port: {rule.source_port || 'Any'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-zinc-900">{rule.destination_address || 'Any'}</div>
                    <div className="text-[10px] font-mono text-zinc-400">Port: {rule.destination_port || 'Any'}</div>
                  </td>
                  <td className="px-6 py-4 text-xs text-zinc-500 italic">{rule.description || 'No description'}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDelete(rule.id)}
                      className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRules.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Shield className="text-zinc-200" size={32} />
                      <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">No firewall rules found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
