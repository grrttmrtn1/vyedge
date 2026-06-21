import React, { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronDown, ChevronRight, RefreshCw, Save, AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { vyosApi } from '../api/vyos';

const cn = (...args: Parameters<typeof clsx>) => twMerge(clsx(args));

interface ServicesTabProps {
  routerId: string;
  token: string;
}

interface ServiceData {
  dhcp: any;
  dns: any;
  ntp: any;
  ssh: any;
}

function CollapsibleSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</span>
        {open ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-white dark:bg-slate-900 space-y-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-widest">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
      />
    </div>
  );
}

export function ServicesTab({ routerId }: ServicesTabProps) {
  const [services, setServices] = useState<ServiceData>({ dhcp: null, dns: null, ntp: null, ssh: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null); // which service is saving

  // Form state — DHCP
  const [dhcpSubnet, setDhcpSubnet] = useState('');
  const [dhcpRangeStart, setDhcpRangeStart] = useState('');
  const [dhcpRangeStop, setDhcpRangeStop] = useState('');
  const [dhcpGateway, setDhcpGateway] = useState('');
  const [dhcpDns, setDhcpDns] = useState('');
  const [dhcpLease, setDhcpLease] = useState('86400');

  // Form state — DNS
  const [dnsListenAddr, setDnsListenAddr] = useState('127.0.0.1');
  const [dnsAllowFrom, setDnsAllowFrom] = useState('0.0.0.0/0');
  const [dnsServers, setDnsServers] = useState('8.8.8.8');
  const [dnsCacheSize, setDnsCacheSize] = useState('10000');

  // Form state — SSH
  const [sshPort, setSshPort] = useState('22');
  const [sshDisablePassword, setSshDisablePassword] = useState(false);

  // Form state — NTP
  const [ntpServers, setNtpServers] = useState('time1.vyos.net time2.vyos.net');

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await vyosApi.send(routerId, 'show', { op: 'showConfig', path: ['service'] }) as any;
      const data = res?.data ?? {};
      setServices({
        dhcp: data['dhcp-server'] ?? null,
        dns: data.dns?.forwarding ?? null,
        ntp: data.ntp ?? null,
        ssh: data.ssh ?? null,
      });

      // Populate form fields from live data
      const dhcpSubnets = data['dhcp-server']?.subnet ?? {};
      const firstSubnet = Object.keys(dhcpSubnets)[0] ?? '';
      if (firstSubnet) {
        setDhcpSubnet(firstSubnet);
        const s = dhcpSubnets[firstSubnet];
        const range = s?.range?.['0'] ?? s?.range?.[Object.keys(s?.range ?? {})[0]] ?? {};
        setDhcpRangeStart(range.start ?? '');
        setDhcpRangeStop(range.stop ?? '');
        setDhcpGateway(s?.['default-router'] ?? '');
        const ns = s?.['name-server'];
        setDhcpDns(Array.isArray(ns) ? ns.join(', ') : (ns ?? ''));
        setDhcpLease(s?.lease ?? '86400');
      }

      if (data.dns?.forwarding) {
        const fwd = data.dns.forwarding;
        const la = fwd['listen-address'];
        setDnsListenAddr(Array.isArray(la) ? la.join(', ') : (la ?? '127.0.0.1'));
        const af = fwd['allow-from'];
        setDnsAllowFrom(Array.isArray(af) ? af.join(', ') : (af ?? '0.0.0.0/0'));
        const ns2 = fwd['name-server'];
        setDnsServers(Array.isArray(ns2) ? ns2.join(', ') : (ns2 ?? ''));
        setDnsCacheSize(fwd['cache-size'] ?? '10000');
      }

      if (data.ssh) {
        setSshPort(data.ssh.port ?? '22');
        setSshDisablePassword('disable-password-authentication' in data.ssh);
      }

      if (data.ntp?.server) {
        setNtpServers(Object.keys(data.ntp.server).join(' '));
      }
    } catch (e: any) {
      setError(e.message ?? 'Failed to load services');
    } finally {
      setLoading(false);
    }
  }, [routerId]);

  React.useEffect(() => { fetchServices(); }, [fetchServices]);

  async function commitSave() {
    await vyosApi.send(routerId, 'configure', { op: 'commit' });
    await vyosApi.send(routerId, 'configure', { op: 'save' });
  }

  const saveDhcp = async () => {
    if (!dhcpSubnet) return;
    setSaving('dhcp');
    setError(null);
    try {
      const base = ['service', 'dhcp-server', 'subnet', dhcpSubnet];
      if (dhcpRangeStart) await vyosApi.send(routerId, 'configure', { op: 'set', path: [...base, 'range', '0', 'start', dhcpRangeStart] });
      if (dhcpRangeStop) await vyosApi.send(routerId, 'configure', { op: 'set', path: [...base, 'range', '0', 'stop', dhcpRangeStop] });
      if (dhcpGateway) await vyosApi.send(routerId, 'configure', { op: 'set', path: [...base, 'default-router', dhcpGateway] });
      if (dhcpDns) await vyosApi.send(routerId, 'configure', { op: 'set', path: [...base, 'name-server', dhcpDns.split(',')[0].trim()] });
      await vyosApi.send(routerId, 'configure', { op: 'set', path: [...base, 'lease', dhcpLease] });
      await commitSave();
      await fetchServices();
    } catch (e: any) {
      setError(e.message ?? 'Failed to save DHCP config');
    } finally {
      setSaving(null);
    }
  };

  const saveDns = async () => {
    setSaving('dns');
    setError(null);
    try {
      const base = ['service', 'dns', 'forwarding'];
      await vyosApi.send(routerId, 'configure', { op: 'set', path: [...base, 'listen-address', dnsListenAddr.split(',')[0].trim()] });
      await vyosApi.send(routerId, 'configure', { op: 'set', path: [...base, 'allow-from', dnsAllowFrom.split(',')[0].trim()] });
      if (dnsServers) await vyosApi.send(routerId, 'configure', { op: 'set', path: [...base, 'name-server', dnsServers.split(',')[0].trim()] });
      if (dnsCacheSize) await vyosApi.send(routerId, 'configure', { op: 'set', path: [...base, 'cache-size', dnsCacheSize] });
      await commitSave();
      await fetchServices();
    } catch (e: any) {
      setError(e.message ?? 'Failed to save DNS config');
    } finally {
      setSaving(null);
    }
  };

  const saveNtp = async () => {
    setSaving('ntp');
    setError(null);
    try {
      for (const srv of ntpServers.split(/\s+/).filter(Boolean)) {
        await vyosApi.send(routerId, 'configure', { op: 'set', path: ['service', 'ntp', 'server', srv] });
      }
      await commitSave();
      await fetchServices();
    } catch (e: any) {
      setError(e.message ?? 'Failed to save NTP config');
    } finally {
      setSaving(null);
    }
  };

  const saveSsh = async () => {
    setSaving('ssh');
    setError(null);
    try {
      await vyosApi.send(routerId, 'configure', { op: 'set', path: ['service', 'ssh', 'port', sshPort] });
      if (sshDisablePassword) {
        await vyosApi.send(routerId, 'configure', { op: 'set', path: ['service', 'ssh', 'disable-password-authentication'] });
      } else {
        await vyosApi.send(routerId, 'configure', { op: 'delete', path: ['service', 'ssh', 'disable-password-authentication'] }).catch(() => {});
      }
      await commitSave();
      await fetchServices();
    } catch (e: any) {
      setError(e.message ?? 'Failed to save SSH config');
    } finally {
      setSaving(null);
    }
  };

  const SaveButton = ({ onClick, service }: { onClick: () => void; service: string }) => (
    <button
      onClick={onClick}
      disabled={saving === service}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
    >
      <Save size={12} />
      {saving === service ? 'Saving…' : 'Save'}
    </button>
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-400 text-xs">
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Services Configuration</h3>
        <button onClick={fetchServices} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      <CollapsibleSection title="DHCP Server" defaultOpen={!!services.dhcp}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Subnet (CIDR)" value={dhcpSubnet} onChange={setDhcpSubnet} />
          <Field label="Default Gateway" value={dhcpGateway} onChange={setDhcpGateway} />
          <Field label="Range Start" value={dhcpRangeStart} onChange={setDhcpRangeStart} />
          <Field label="Range Stop" value={dhcpRangeStop} onChange={setDhcpRangeStop} />
          <Field label="DNS Servers (comma-sep)" value={dhcpDns} onChange={setDhcpDns} />
          <Field label="Lease Time (sec)" value={dhcpLease} onChange={setDhcpLease} />
        </div>
        <div className="flex justify-end pt-1"><SaveButton onClick={saveDhcp} service="dhcp" /></div>
      </CollapsibleSection>

      <CollapsibleSection title="DNS Forwarding" defaultOpen={!!services.dns}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Listen Address" value={dnsListenAddr} onChange={setDnsListenAddr} />
          <Field label="Allow From" value={dnsAllowFrom} onChange={setDnsAllowFrom} />
          <Field label="Name Servers (comma-sep)" value={dnsServers} onChange={setDnsServers} />
          <Field label="Cache Size" value={dnsCacheSize} onChange={setDnsCacheSize} />
        </div>
        <div className="flex justify-end pt-1"><SaveButton onClick={saveDns} service="dns" /></div>
      </CollapsibleSection>

      <CollapsibleSection title="NTP" defaultOpen={!!services.ntp}>
        <Field label="Servers (space-separated)" value={ntpServers} onChange={setNtpServers} />
        <div className="flex justify-end pt-1"><SaveButton onClick={saveNtp} service="ntp" /></div>
      </CollapsibleSection>

      <CollapsibleSection title="SSH" defaultOpen={!!services.ssh}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Port" value={sshPort} onChange={setSshPort} />
          <div className="flex items-center gap-2 pt-4">
            <input
              type="checkbox"
              id="ssh-nopassword"
              checked={sshDisablePassword}
              onChange={e => setSshDisablePassword(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600 text-indigo-600"
            />
            <label htmlFor="ssh-nopassword" className="text-xs text-slate-600 dark:text-slate-400">Disable Password Auth</label>
          </div>
        </div>
        <div className="flex justify-end pt-1"><SaveButton onClick={saveSsh} service="ssh" /></div>
      </CollapsibleSection>
    </div>
  );
}
