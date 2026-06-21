import React, { useState } from 'react';
import { Zap, Network, ShieldCheck, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

interface LoginViewProps {
  onLogin: (username: string, password: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const FEATURE_BULLETS = [
  { icon: <Network size={14} />, text: 'Centralized VyOS fleet management' },
  { icon: <ShieldCheck size={14} />, text: 'Encrypted API key storage' },
  { icon: <Lock size={14} />, text: 'JWT-secured session management' },
];

export function LoginView({ onLogin, loading, error }: LoginViewProps) {
  const [form, setForm] = useState({ username: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLogin(form.username, form.password);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 to-slate-800 flex-col p-12 relative overflow-hidden">
        <div className="flex items-center gap-3 mb-auto">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/50">
            <Zap size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">Vy Edge</span>
        </div>

        <div className="my-auto">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Enterprise Network<br />Intelligence Platform
          </h1>
          <p className="text-slate-400 text-base leading-relaxed mb-8 max-w-sm">
            Manage your VyOS fleet from a single control plane with real-time visibility and audit logging.
          </p>
          <ul className="space-y-3">
            {FEATURE_BULLETS.map((b, i) => (
              <li key={i} className="flex items-center gap-3 text-slate-300 text-sm">
                <div className="w-6 h-6 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
                  {b.icon}
                </div>
                {b.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-slate-600 text-xs">v2.5.0-enterprise · Self-hosted</p>

        {/* Decorative circles */}
        <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-indigo-600/5 border border-indigo-600/10" />
        <div className="absolute -bottom-12 -right-12 w-40 h-40 rounded-full bg-indigo-600/5 border border-indigo-600/10" />
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Zap size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">Vy Edge</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-1">Sign in</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Enter your credentials to access the management console</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              placeholder="admin"
              disabled={loading}
            />
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              disabled={loading}
            />

            {error && (
              <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl">
                <p className="text-sm text-rose-700 font-medium">{error}</p>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full py-2.5 mt-2">
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-8">
            VyEdge v2.5.0-enterprise · Self-hosted deployment
          </p>
        </motion.div>
      </div>
    </div>
  );
}
