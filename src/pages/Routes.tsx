import React, { useEffect, useState } from 'react';
import { Card, Button, Input, Badge } from '../components/UI';
import { Network, Plus, Trash2, Search, AlertCircle, RefreshCcw } from 'lucide-react';
import { Route } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export const Routes: React.FC = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    destination: '',
    next_hop: '',
    interface: '',
    description: ''
  });
  const [error, setError] = useState<string | null>(null);

  const fetchRoutes = async () => {
    setLoading(true);
    const token = localStorage.getItem('nexus_token');
    try {
      const res = await fetch('/api/routes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setRoutes(data);
    } catch (err) {
      console.error("Failed to fetch routes", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const token = localStorage.getItem('nexus_token');
    try {
      const res = await fetch('/api/routes', {
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
        setForm({ destination: '', next_hop: '', interface: '', description: '' });
        fetchRoutes();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to connect to server");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this route?")) return;
    const token = localStorage.getItem('nexus_token');
    await fetch(`/api/routes/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchRoutes();
  };

  const filteredRoutes = routes.filter(r => 
    r.destination.includes(search) || 
    r.next_hop.includes(search) || 
    r.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Static Routing</h1>
          <p className="text-sm text-zinc-500">Manage static network routes and gateway interfaces.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchRoutes}>
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
          <Button onClick={() => setShowAdd(!showAdd)}>
            <Plus size={16} />
            {showAdd ? 'Cancel' : 'Add Route'}
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
            <Card title="New Static Route" subtitle="Define destination network and next-hop gateway">
              <form onSubmit={handleAdd} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Input 
                    label="Destination Network" 
                    placeholder="192.168.10.0/24" 
                    value={form.destination}
                    onChange={e => setForm({...form, destination: e.target.value})}
                  />
                  <Input 
                    label="Next Hop IP" 
                    placeholder="10.0.0.1" 
                    value={form.next_hop}
                    onChange={e => setForm({...form, next_hop: e.target.value})}
                  />
                  <Input 
                    label="Interface (Optional)" 
                    placeholder="eth0" 
                    value={form.interface}
                    onChange={e => setForm({...form, interface: e.target.value})}
                  />
                  <Input 
                    label="Description" 
                    placeholder="Internal LAN Route" 
                    value={form.description}
                    onChange={e => setForm({...form, description: e.target.value})}
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
                  <Button type="submit">Create Route</Button>
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
              placeholder="Search routes..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-white border border-zinc-200 rounded-full text-xs focus:ring-2 focus:ring-zinc-900/5 transition-all w-full"
            />
          </div>
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            {filteredRoutes.length} Routes Total
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Destination</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Next Hop</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Interface</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Description</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredRoutes.map(route => (
                <tr key={route.id} className="hover:bg-zinc-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                        <Network size={14} />
                      </div>
                      <span className="text-sm font-bold text-zinc-900">{route.destination}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600 font-mono">{route.next_hop}</td>
                  <td className="px-6 py-4">
                    <Badge variant="neutral">{route.interface || 'Any'}</Badge>
                  </td>
                  <td className="px-6 py-4 text-xs text-zinc-500 italic">{route.description || 'No description'}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDelete(route.id)}
                      className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRoutes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Network className="text-zinc-200" size={32} />
                      <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">No routes found</p>
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
