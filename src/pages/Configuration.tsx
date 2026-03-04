import React, { useEffect, useState } from 'react';
import { Card, Badge, Button } from '../components/UI';
import { FileText, Search, RefreshCcw, Terminal, Download, Copy, Check } from 'lucide-react';

export const Configuration: React.FC = () => {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchConfig = async () => {
    setLoading(true);
    const token = localStorage.getItem('nexus_token');
    const headers = { Authorization: `Bearer ${token}` };
    
    try {
      const [routes, firewall, vpn] = await Promise.all([
        fetch('/api/routes', { headers }).then(r => r.json()),
        fetch('/api/firewall', { headers }).then(r => r.json()),
        fetch('/api/vpn', { headers }).then(r => r.json())
      ]);

      setConfig({
        system: {
          hostname: 'Nexus-Edge-01',
          version: '3.0.0',
          tenant: 'Default'
        },
        routing: {
          static: routes
        },
        firewall: {
          rules: firewall
        },
        vpn: {
          tunnels: vpn
        }
      });
    } catch (err) {
      console.error("Failed to fetch configuration", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">System Configuration</h1>
          <p className="text-sm text-zinc-500">Unified view of all gateway policies and network parameters.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchConfig}>
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleCopy}>
            {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy JSON'}
          </Button>
          <Button>
            <Download size={16} />
            Export Config
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="p-0 overflow-hidden bg-zinc-900 border-zinc-800">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-zinc-500" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">nexus_edge_config.json</span>
              </div>
              <Badge variant="neutral">Read-Only</Badge>
            </div>
            <div className="p-6 overflow-x-auto">
              <pre className="text-xs font-mono text-zinc-300 leading-relaxed">
                {config ? JSON.stringify(config, null, 2) : '// Loading configuration...'}
              </pre>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Configuration Summary">
            <div className="space-y-4">
              <SummaryItem label="Total Routes" value={config?.routing.static.length || 0} />
              <SummaryItem label="Firewall Rules" value={config?.firewall.rules.length || 0} />
              <SummaryItem label="VPN Tunnels" value={config?.vpn.tunnels.length || 0} />
              <SummaryItem label="Last Updated" value={new Date().toLocaleTimeString()} />
            </div>
          </Card>

          <Card title="Quick Search" subtitle="Find specific policy parameters">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
              <input 
                type="text" 
                placeholder="Search config keys..." 
                className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-100 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-zinc-900/5 transition-all"
              />
            </div>
          </Card>

          <div className="p-6 rounded-2xl bg-amber-50 border border-amber-100">
            <div className="flex items-start gap-3">
              <FileText className="text-amber-600 mt-1" size={18} />
              <div>
                <h4 className="text-sm font-bold text-amber-900">Enterprise Backup</h4>
                <p className="text-xs text-amber-700 mt-1">
                  Automatic configuration backups are enabled. Last backup successful at 04:00 AM.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SummaryItem = ({ label, value }: { label: string; value: number | string }) => (
  <div className="flex justify-between items-center py-2 border-b border-zinc-50 last:border-0">
    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{label}</span>
    <span className="text-sm font-bold text-zinc-900">{value}</span>
  </div>
);
