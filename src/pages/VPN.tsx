import React, { useEffect, useState } from 'react';
import { Card, Button, Input, Badge, Select } from '../components/UI';
import { Lock, Plus, Trash2, RefreshCcw, ShieldCheck, Search, AlertCircle } from 'lucide-react';
import { VPNTunnel } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export const VPN: React.FC = () => {
  const [tunnels, setTunnels] = useState<VPNTunnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '',
    remote_peer: '',
    local_address: '',
    shared_secret: '',
    encryption: 'aes256'
  });
  const [error, setError] = useState<string | null>(null);

  const fetchTunnels = async () => {
    setLoading(true);
    const token = localStorage.getItem('nexus_token');
    try {
      const res = await fetch('/api/vpn', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setTunnels(data);
    } catch (err) {
      console.error("Failed to fetch VPN tunnels", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTunnels();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const token = localStorage.getItem('nexus_token');
    try {
      const res = await fetch('/api/vpn', {
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
          name: '',
          remote_peer: '',
          local_address: '',
          shared_secret: '',
          encryption: 'aes256'
        });
        fetchTunnels();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to connect to server");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this VPN tunnel?")) return;
    const token = localStorage.getItem('nexus_token');
    await fetch(`/api/vpn/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchTunnels();
  };

  const filteredTunnels = tunnels.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.remote_peer.includes(search)
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">VPN Orchestration</h1>
          <p className="text-sm text-zinc-500">Manage site-to-site tunnels and remote access endpoints.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchTunnels}>
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
          <Button onClick={() => setShowAdd(!showAdd)}>
            <Plus size={16} />
            {showAdd ? 'Cancel' : 'Add Tunnel'}
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
            <Card title="New VPN Tunnel" subtitle="Establish a secure encrypted connection">
              <form onSubmit={handleAdd} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Input 
                    label="Tunnel Name" 
                    placeholder="Site-B-Edge" 
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                  />
                  <Input 
                    label="Remote Peer IP" 
                    placeholder="203.0.113.10" 
                    value={form.remote_peer}
                    onChange={e => setForm({...form, remote_peer: e.target.value})}
                  />
                  <Select 
                    label="Encryption" 
                    value={form.encryption}
                    onChange={e => setForm({...form, encryption: e.target.value})}
                    options={[
                      { value: 'aes128', label: 'AES-128' },
                      { value: 'aes256', label: 'AES-256' },
                      { value: 'chacha20', label: 'ChaCha20' }
                    ]}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input 
                    label="Local Address (Optional)" 
                    placeholder="192.168.1.1" 
                    value={form.local_address}
                    onChange={e => setForm({...form, local_address: e.target.value})}
                  />
                  <Input 
                    label="Shared Secret" 
                    type="password"
                    placeholder="••••••••••••" 
                    value={form.shared_secret}
                    onChange={e => setForm({...form, shared_secret: e.target.value})}
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
                  <Button type="submit">Establish Tunnel</Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
          <input 
            type="text" 
            placeholder="Search tunnels..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-1.5 bg-white border border-zinc-200 rounded-full text-xs focus:ring-2 focus:ring-zinc-900/5 transition-all w-full"
          />
        </div>
        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
          {filteredTunnels.length} Tunnels Total
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTunnels.map(tunnel => (
          <Card key={tunnel.id} className="group hover:border-zinc-900/20 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
                <ShieldCheck size={20} />
              </div>
              <div className="flex gap-2">
                <Badge variant={tunnel.status === 'up' ? 'success' : 'danger'}>{tunnel.status}</Badge>
                <button 
                  onClick={() => handleDelete(tunnel.id)}
                  className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <h4 className="text-lg font-bold text-zinc-900">{tunnel.name}</h4>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                <span>Remote Peer</span>
                <span className="text-zinc-900 font-mono">{tunnel.remote_peer}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                <span>Encryption</span>
                <span className="text-zinc-900 uppercase">{tunnel.encryption}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                <span>Created</span>
                <span className="text-zinc-900">{new Date(tunnel.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-zinc-100">
              <Button variant="outline" className="w-full text-xs" size="sm">
                View Tunnel Logs
              </Button>
            </div>
          </Card>
        ))}
        {filteredTunnels.length === 0 && (
          <div className="col-span-full py-24 flex flex-col items-center gap-3 bg-white border border-dashed border-zinc-200 rounded-3xl">
            <Lock className="text-zinc-200" size={48} />
            <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">No active VPN tunnels</p>
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(true)}>Create your first tunnel</Button>
          </div>
        )}
      </div>
    </div>
  );
};
