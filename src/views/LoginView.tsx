import React, { useState } from 'react';
import { Shield, Activity, AlertCircle, Lock, Globe } from 'lucide-react';
import { motion } from 'motion/react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

interface LoginViewProps {
  onLogin: (username: string, password: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function LoginView({ onLogin, loading, error }: LoginViewProps) {
  const [form, setForm] = useState({ username: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLogin(form.username, form.password);
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-900 text-white mb-4 shadow-xl">
            <Shield size={32} />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Vy Edge Manager</h1>
          <p className="text-zinc-500 text-sm font-medium">Enterprise Network Intelligence</p>
        </div>

        <Card className="p-8 border-zinc-200/60 shadow-xl shadow-zinc-200/50">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Corporate Identity"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              placeholder="Username"
            />
            <Input
              label="Access Key"
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 text-red-600 bg-red-50/50 border border-red-100 p-3 rounded-xl text-xs font-semibold"
              >
                <AlertCircle size={14} />
                {error}
              </motion.div>
            )}
            <Button
              type="submit"
              className="w-full h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold tracking-wide transition-all active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Activity size={16} className="animate-spin" />
                  <span>Verifying...</span>
                </div>
              ) : "Authorize Access"}
            </Button>
          </form>
        </Card>

        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="flex items-center gap-6 opacity-40 grayscale">
            <Shield size={16} />
            <Lock size={16} />
            <Globe size={16} />
          </div>
          <p className="text-center text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em]">
            Secure Gateway • End-to-End Encryption • Audit Enabled
          </p>
        </div>
      </motion.div>
    </div>
  );
}
