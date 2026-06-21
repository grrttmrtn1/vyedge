import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Shield,
  RefreshCcw,
} from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SettingsProps {
  token: string;
}

export function Settings({ token }: SettingsProps) {
  const [settings, setSettings] = useState<Record<string, string | boolean | number>>({
    sso_enabled: false,
    sso_provider_url: '',
    sso_client_id: '',
    sso_client_secret: '',
    sso_type: 'saml',
    syslog_enabled: false,
    syslog_host: '',
    syslog_port: '514',
    tenancy_enabled: true,
    audit_retention: '90',
    encryption_at_rest: true,
    session_timeout: '30',
    compliance_mode: 'standard'
  });
  const [sysInfo, setSysInfo] = useState<{ memory: { rss: number } } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setSettings(prev => ({ ...prev, ...data })));

    fetch('/api/system-info', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(setSysInfo);
  }, [token]);

  const updateSetting = async (key: string, value: string | boolean | number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ key, value })
    });
  };

  const handleSystemAction = async (action: 'backup' | 'restore' | 'restart') => {
    setLoading(action);
    try {
      const res = await fetch(`/api/system/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
      } else {
        alert(data.error);
      }
    } catch {
      alert("Action failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card title="Core Configuration" subtitle="Global application parameters">
            <div className="space-y-8">
              <div className="space-y-4">
                <ToggleItem
                  title="Enterprise Single Sign-On (SSO)"
                  description="Enable SAML 2.0 / OIDC authentication for all operators."
                  enabled={settings.sso_enabled as boolean}
                  onToggle={() => updateSetting('sso_enabled', !settings.sso_enabled)}
                />
                {settings.sso_enabled && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pl-14 space-y-4 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 dark:text-slate-500 uppercase tracking-widest">SSO Type</label>
                        <select
                          className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                          value={settings.sso_type as string}
                          onChange={e => updateSetting('sso_type', e.target.value)}
                        >
                          <option value="saml">SAML 2.0</option>
                          <option value="oidc">OIDC</option>
                        </select>
                      </div>
                      <Input label="Provider URL" value={settings.sso_provider_url as string} onChange={e => updateSetting('sso_provider_url', e.target.value)} placeholder="https://idp.example.com" />
                      <Input label="Client ID" value={settings.sso_client_id as string} onChange={e => updateSetting('sso_client_id', e.target.value)} placeholder="vy-edge-manager" />
                      <Input label="Client Secret" type="password" value={settings.sso_client_secret as string} onChange={e => updateSetting('sso_client_secret', e.target.value)} placeholder="••••••••" />
                    </div>
                  </motion.div>
                )}
              </div>
              <div className="h-px bg-zinc-100 dark:bg-slate-700" />
              <div className="space-y-4">
                <label className="text-xs font-bold text-zinc-900 dark:text-slate-100 uppercase tracking-widest">Centralized Syslog Endpoint</label>
                <div className="flex gap-3">
                  <input
                    className="flex-1 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:bg-white focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all font-mono dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:focus:bg-slate-600 dark:placeholder:text-slate-500"
                    placeholder="syslog.internal.vyedge.com"
                    value={settings.syslog_host as string}
                    onChange={e => updateSetting('syslog_host', e.target.value)}
                  />
                  <input
                    className="w-24 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:bg-white focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all font-mono dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:focus:bg-slate-600"
                    placeholder="514"
                    value={settings.syslog_port as string}
                    onChange={e => updateSetting('syslog_port', e.target.value)}
                  />
                  <Button variant="outline">Test Connection</Button>
                </div>
                <p className="text-[10px] text-zinc-400 dark:text-slate-500 font-medium italic">All edge node audit logs will be forwarded to this endpoint in real-time.</p>
              </div>
              <div className="h-px bg-zinc-100 dark:bg-slate-700" />
              <div className="space-y-4">
                <label className="text-xs font-bold text-zinc-900 dark:text-slate-100 uppercase tracking-widest">Audit Retention Policy</label>
                <select
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:bg-white focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all font-medium dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:focus:bg-slate-600"
                  value={settings.audit_retention as string}
                  onChange={e => updateSetting('audit_retention', e.target.value)}
                >
                  <option value="30">30 Days (Standard)</option>
                  <option value="90">90 Days (Compliance)</option>
                  <option value="365">1 Year (Long-term)</option>
                  <option value="0">Indefinite (High-Storage)</option>
                </select>
              </div>
            </div>
          </Card>

          <Card title="Security & Compliance" subtitle="Access control and data protection">
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100 dark:bg-slate-700/50 dark:border-slate-700">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-400">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900 dark:text-slate-100">Encryption at Rest</p>
                    <p className="text-[10px] text-zinc-400 dark:text-slate-500 font-bold uppercase tracking-widest">AES-256-GCM • {settings.encryption_at_rest ? 'Active' : 'Disabled'}</p>
                  </div>
                </div>
                <Button variant={settings.encryption_at_rest ? 'secondary' : 'primary'} size="sm" onClick={() => updateSetting('encryption_at_rest', !settings.encryption_at_rest)}>
                  {settings.encryption_at_rest ? 'Disable' : 'Enable'}
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100 dark:bg-slate-700/50 dark:border-slate-700">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-400">
                    <Lock size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900 dark:text-slate-100">Session Management</p>
                    <p className="text-[10px] text-zinc-400 dark:text-slate-500 font-bold uppercase tracking-widest">{settings.session_timeout}m Timeout • Multi-device</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="px-2 py-1 bg-white border border-zinc-200 rounded-lg text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                    value={settings.session_timeout as string}
                    onChange={e => updateSetting('session_timeout', e.target.value)}
                  >
                    <option value="15">15m</option>
                    <option value="30">30m</option>
                    <option value="60">1h</option>
                    <option value="240">4h</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100 dark:bg-slate-700/50 dark:border-slate-700">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-400">
                    <Shield size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900 dark:text-slate-100">Compliance Mode</p>
                    <p className="text-[10px] text-zinc-400 dark:text-slate-500 font-bold uppercase tracking-widest">Current: {settings.compliance_mode}</p>
                  </div>
                </div>
                <select
                  className="px-2 py-1 bg-white border border-zinc-200 rounded-lg text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                  value={settings.compliance_mode as string}
                  onChange={e => updateSetting('compliance_mode', e.target.value)}
                >
                  <option value="standard">Standard</option>
                  <option value="hipaa">HIPAA</option>
                  <option value="pci">PCI-DSS</option>
                  <option value="soc2">SOC2</option>
                </select>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          <Card title="System Health" subtitle="Manager instance status">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-400 dark:text-slate-500 uppercase tracking-widest">API Status</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-emerald-600">Operational</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-400 dark:text-slate-500 uppercase tracking-widest">Database</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-zinc-900 dark:text-slate-100">Healthy</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-400 dark:text-slate-500 uppercase tracking-widest">Memory</span>
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-slate-100">
                  {sysInfo ? `${Math.round(sysInfo.memory.rss / 1024 / 1024)}MB / 512MB` : 'Loading...'}
                </div>
              </div>
              <div className="pt-4 border-t border-zinc-100 dark:border-slate-700">
                <Button variant="secondary" className="w-full" onClick={() => handleSystemAction('restart')} disabled={loading === 'restart'}>
                  <RefreshCcw size={14} className={cn(loading === 'restart' && "animate-spin")} /> {loading === 'restart' ? 'Restarting...' : 'Restart Services'}
                </Button>
              </div>
            </div>
          </Card>

          <Card title="Backup & Recovery" subtitle="Automated snapshots">
            <div className="space-y-6">
              <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Last Backup</p>
                <p className="text-sm font-bold text-white">Today, 04:00 AM</p>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 text-white border-zinc-700 hover:bg-zinc-800" onClick={() => handleSystemAction('restore')} disabled={loading === 'restore'}>
                    {loading === 'restore' ? 'Restoring...' : 'Restore'}
                  </Button>
                  <Button variant="primary" size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-500" onClick={() => handleSystemAction('backup')} disabled={loading === 'backup'}>
                    {loading === 'backup' ? 'Backing up...' : 'Backup Now'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}

function ToggleItem({ title, description, enabled, onToggle, children }: { title: string; description: string; enabled: boolean; onToggle: () => void; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-start justify-between">
        <div className="flex-1 pr-8">
          <h5 className="text-sm font-bold text-zinc-900 dark:text-slate-100">{title}</h5>
          <p className="text-xs text-zinc-500 dark:text-slate-400 mt-1">{description}</p>
        </div>
        <div
          onClick={onToggle}
          className={cn(
            "w-10 h-5 rounded-full relative transition-colors cursor-pointer",
            enabled ? "bg-zinc-900 dark:bg-indigo-600" : "bg-zinc-200 dark:bg-slate-600"
          )}
        >
          <div className={cn(
            "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
            enabled ? "right-1" : "left-1"
          )} />
        </div>
      </div>
      {children}
    </div>
  );
}
