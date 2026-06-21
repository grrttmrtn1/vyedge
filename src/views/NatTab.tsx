import React, { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Plus, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { vyosApi } from '../api/vyos';

const cn = (...args: Parameters<typeof clsx>) => twMerge(clsx(args));

interface NatRule {
  ruleNumber: string;
  type: 'source' | 'destination';
  outboundInterface?: string;
  translationAddress?: string;
  description?: string;
}

interface AddRuleForm {
  type: 'source' | 'destination';
  ruleNumber: string;
  outboundInterface: string;
  translationAddress: string;
  description: string;
}

interface NatTabProps {
  routerId: string;
  token: string;
}

function parseNatRules(data: Record<string, any>, type: 'source' | 'destination'): NatRule[] {
  if (!data || typeof data !== 'object') return [];
  return Object.entries(data).map(([ruleNumber, rule]: [string, any]) => ({
    ruleNumber,
    type,
    outboundInterface: rule['outbound-interface']?.name,
    translationAddress: rule.translation?.address,
    description: rule.description,
  }));
}

export function NatTab({ routerId }: NatTabProps) {
  const [rules, setRules] = useState<NatRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AddRuleForm>({
    type: 'source',
    ruleNumber: '',
    outboundInterface: 'eth0',
    translationAddress: 'masquerade',
    description: '',
  });

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [srcRes, dstRes] = await Promise.all([
        vyosApi.send(routerId, 'show', { op: 'showConfig', path: ['nat', 'source', 'rule'] }) as Promise<any>,
        vyosApi.send(routerId, 'show', { op: 'showConfig', path: ['nat', 'destination', 'rule'] }) as Promise<any>,
      ]);
      const src = parseNatRules((srcRes as any)?.data ?? {}, 'source');
      const dst = parseNatRules((dstRes as any)?.data ?? {}, 'destination');
      setRules([...src, ...dst].sort((a, b) => Number(a.ruleNumber) - Number(b.ruleNumber)));
    } catch (e: any) {
      setError(e.message ?? 'Failed to load NAT rules');
    } finally {
      setLoading(false);
    }
  }, [routerId]);

  React.useEffect(() => { fetchRules(); }, [fetchRules]);

  const addRule = async () => {
    if (!form.ruleNumber.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const basePath = ['nat', form.type, 'rule', form.ruleNumber];
      await vyosApi.send(routerId, 'configure', { op: 'set', path: [...basePath, 'outbound-interface', 'name', form.outboundInterface] });
      await vyosApi.send(routerId, 'configure', { op: 'set', path: [...basePath, 'translation', 'address', form.translationAddress] });
      if (form.description) {
        await vyosApi.send(routerId, 'configure', { op: 'set', path: [...basePath, 'description', form.description] });
      }
      await vyosApi.send(routerId, 'configure', { op: 'commit' });
      await vyosApi.send(routerId, 'configure', { op: 'save' });
      setShowForm(false);
      setForm({ type: 'source', ruleNumber: '', outboundInterface: 'eth0', translationAddress: 'masquerade', description: '' });
      await fetchRules();
    } catch (e: any) {
      setError(e.message ?? 'Failed to add rule');
    } finally {
      setSaving(false);
    }
  };

  const deleteRule = async (rule: NatRule) => {
    setSaving(true);
    setError(null);
    try {
      await vyosApi.send(routerId, 'configure', { op: 'delete', path: ['nat', rule.type, 'rule', rule.ruleNumber] });
      await vyosApi.send(routerId, 'configure', { op: 'commit' });
      await vyosApi.send(routerId, 'configure', { op: 'save' });
      await fetchRules();
    } catch (e: any) {
      setError(e.message ?? 'Failed to delete rule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">NAT Rules</h3>
        <div className="flex gap-2">
          <button
            onClick={fetchRules}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Plus size={13} />
            Add Rule
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-400 text-xs">
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3"
          >
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Add NAT Rule</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as 'source' | 'destination' }))}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="source">Source (SNAT)</option>
                  <option value="destination">Destination (DNAT)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Rule Number</label>
                <input
                  value={form.ruleNumber}
                  onChange={e => setForm(f => ({ ...f, ruleNumber: e.target.value }))}
                  placeholder="10"
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Outbound Interface</label>
                <input
                  value={form.outboundInterface}
                  onChange={e => setForm(f => ({ ...f, outboundInterface: e.target.value }))}
                  placeholder="eth0"
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Translation Address</label>
                <input
                  value={form.translationAddress}
                  onChange={e => setForm(f => ({ ...f, translationAddress: e.target.value }))}
                  placeholder="masquerade"
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Description (optional)</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="LAN to WAN masquerade"
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
              <button onClick={addRule} disabled={saving || !form.ruleNumber} className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : 'Add Rule'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-8 text-sm text-slate-400 dark:text-slate-500">No NAT rules configured</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-700">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Rule</th>
                <th className="px-4 py-2.5 text-left font-medium">Type</th>
                <th className="px-4 py-2.5 text-left font-medium">Interface</th>
                <th className="px-4 py-2.5 text-left font-medium">Translation</th>
                <th className="px-4 py-2.5 text-left font-medium">Description</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {rules.map(rule => (
                <tr key={`${rule.type}-${rule.ruleNumber}`} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-slate-900 dark:text-slate-100">{rule.ruleNumber}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', rule.type === 'source' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400')}>
                      {rule.type === 'source' ? 'SNAT' : 'DNAT'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-slate-600 dark:text-slate-400">{rule.outboundInterface ?? '—'}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-600 dark:text-slate-400">{rule.translationAddress ?? '—'}</td>
                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{rule.description ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => deleteRule(rule)}
                      disabled={saving}
                      className="p-1 rounded text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
