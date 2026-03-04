import React, { useState } from 'react';
import { Card, Button, Input } from '../components/UI';
import { Shield, Lock, AlertCircle, User } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  onLogin: (token: string, user: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        onLogin(data.token, data.user);
      } else {
        setError(data.error);
      }
    } catch {
      setError("Connection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-zinc-900 text-white mb-6 shadow-2xl shadow-zinc-900/40">
            <Shield size={40} />
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Nexus Edge</h1>
          <p className="text-zinc-500 text-sm font-medium mt-1 uppercase tracking-widest">Enterprise Gateway v3.0</p>
        </div>

        <Card className="p-10 shadow-2xl shadow-zinc-900/5 border-zinc-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input 
              label="Username" 
              icon={User}
              value={form.username} 
              onChange={e => setForm({...form, username: e.target.value})}
              placeholder="admin"
            />
            <Input 
              label="Password" 
              type="password"
              icon={Lock}
              value={form.password} 
              onChange={e => setForm({...form, password: e.target.value})}
              placeholder="••••••••"
            />
            
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-2xl text-xs font-bold uppercase tracking-tight"
              >
                <AlertCircle size={16} />
                {error}
              </motion.div>
            )}

            <Button type="submit" className="w-full py-4 text-base" disabled={loading}>
              {loading ? "Authenticating..." : "Sign In to Gateway"}
            </Button>
          </form>
        </Card>
        
        <div className="mt-10 text-center space-y-4">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">
            Secure Access Only • All Attempts Logged
          </p>
          <div className="flex justify-center gap-6">
            <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              System Online
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Encrypted Session
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
