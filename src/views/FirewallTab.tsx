import React, { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ShieldCheck, Plus, Trash2, RefreshCw, AlertCircle, Rocket, Eye } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { vyosApi } from '../api/vyos';
import { apiFetch } from '../api/client';
import type { FirewallDraft } from '../types';

const cn = (...args: Parameters<typeof clsx>) => twMerge(clsx(args));

interface FirewallTabProps {
  routerId: string;
  token: string;
}

interface FwRule {
  ruleNumber: string;
  action: string;
  description?: string;
}

interface FwRuleSet {
  name: string;
  defaultAction: string;
  rules: FwRule[];
}

interface FwGroups {
  addressGroups: Record<string, string[]>;
  networkGroups: Record<string, string[]>;
}

function parseFirewall(data: any): { ruleSets: FwRuleSet[]; groups: FwGroups } {
  const fwData = data ?? {};
  const ruleSets: FwRuleSet[] = Object.entries(fwData.name ?? {}).map(([name, cfg]: [string, any]) => ({
    name,
    defaultAction: cfg?.['default-action'] ?? 'accept',
    rules: Object.entries(cfg?.rule ?? {}).map(([num, rule]: [string, any]) => ({
      ruleNumber: num,
      action: rule?.action ?? 'accept',
      description: rule?.description,
    })).sort((a, b) => Number(a.ruleNumber) - Number(b.ruleNumber)),
  }));

  const groups: FwGroups = {
    addressGroups: Object.fromEntries(
      Object.entries(fwData?.group?.['address-group'] ?? {}).map(([k, v]: [string, any]) => [k, [v?.address].flat().filter(Boolean)])
    ),
    networkGroups: Object.fromEntries(
      Object.entries(fwData?.group?.['network-group'] ?? {}).map(([k, v]: [string, any]) => [k, [v?.network].flat().filter(Boolean)])
    ),
  };

  return { ruleSets, groups };
}

export function FirewallTab({ routerId }: FirewallTabProps) {
  const [ruleSets, setRuleSets] = useState<FwRuleSet[]>([]);
  const [groups, setGroups] = useState<FwGroups>({ addressGroups: {}, networkGroups: {} });
  const [drafts, setDrafts] = useState<FirewallDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  // Add rule form state
  const [addingToSet, setAddingToSet] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({ ruleNumber: '', action: 'accept', description: '' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fwRes, draftsRes] = await Promise.all([
        vyosApi.send(routerId, 'show', { op: 'showConfig', path: ['firewall'] }) as Promise<any>,
        apiFetch<FirewallDraft[]>(`/api/firewall/${routerId}/drafts`),
      ]);
      const parsed = parseFirewall(fwRes?.data);
      setRuleSets(parsed.ruleSets);
      setGroups(parsed.groups);
      setDrafts(draftsRes);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load firewall config');
    } finally {
      setLoading(false);
    }
  }, [routerId]);

  React.useEffect(() => { fetchAll(); }, [fetchAll]);

  const addDraft = async (operation: 'set' | 'delete', path: string[], value?: string) => {
    const draft = await apiFetch<{ id: string }>(`/api/firewall/${routerId}/drafts`, {
      method: 'POST',
      body: JSON.stringify({ operation, path, value }),
    });
    setDrafts(d => [...d, { id: draft.id, router_id: routerId, operation, path, value, created_at: new Date().toISOString() }]);
  };

  const removeDraft = async (id: string) => {
    await apiFetch(`/api/firewall/${routerId}/drafts/${id}`, { method: 'DELETE' });
    setDrafts(d => d.filter(x => x.id !== id));
  };

  const addRule = async (setName: string) => {
    if (!addForm.ruleNumber) return;
    const base = ['firewall', 'name', setName, 'rule', addForm.ruleNumber];
    await addDraft('set', [...base, 'action', addForm.action]);
    if (addForm.description) await addDraft('set', [...base, 'description', addForm.description]);
    setAddingToSet(null);
    setAddForm({ ruleNumber: '', action: 'accept', description: '' });
  };

  const deleteRule = async (setName: string, ruleNumber: string) => {
    await addDraft('delete', ['firewall', 'name', setName, 'rule', ruleNumber]);
  };

  const deploy = async () => {
    setDeploying(true);
    setError(null);
    setShowDiff(false);
    try {
      await apiFetch<{ applied: number }>(`/api/firewall/${routerId}/deploy`, { method: 'POST' });
      setDrafts([]);
      await fetchAll();
    } catch (e: any) {
      setError(e.message ?? 'Deploy failed');
    } finally {
      setDeploying(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <ShieldCheck size={15} className="text-indigo-500" />
          Firewall Policy
        </h3>
        <div className="flex gap-2">
          <button onClick={fetchAll} disabled={loading} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {drafts.length > 0 && (
            <>
              <button
                onClick={() => setShowDiff(s => !s)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
              >
                <Eye size={12} />
                Diff ({drafts.length})
              </button>
              <button
                onClick={deploy}
                disabled={deploying}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Rocket size={12} />
                {deploying ? 'Deploying…' : 'Deploy'}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-400 text-xs">
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      {/* Diff Preview */}
      <AnimatePresence>
        {showDiff && drafts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="border border-indigo-200 dark:border-indigo-800 rounded-xl overflow-hidden"
          >
            <div className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Pending Changes ({drafts.length})</span>
              <button onClick={() => setShowDiff(false)} className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 text-xs">Close</button>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {drafts.map(d => (
                <div key={d.id} className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-900">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', d.operation === 'set' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400')}>
                      {d.operation}
                    </span>
                    <code className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                      {d.path.join(' ')}
                      {d.value ? ` = ${d.value}` : ''}
                    </code>
                  </div>
                  <button onClick={() => removeDraft(d.id)} className="p-1 text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 transition-colors">
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Named Rule Sets */}
      {ruleSets.length === 0 ? (
        <div className="text-center py-8 text-sm text-slate-400 dark:text-slate-500">No firewall rule sets configured</div>
      ) : (
        <div className="space-y-3">
          {ruleSets.map(set => (
            <div key={set.name} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{set.name}</span>
                  <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', set.defaultAction === 'accept' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400')}>
                    default: {set.defaultAction}
                  </span>
                </div>
                <button
                  onClick={() => { setAddingToSet(set.name === addingToSet ? null : set.name); }}
                  className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                >
                  <Plus size={12} /> Add Rule
                </button>
              </div>

              {/* Add rule form for this set */}
              <AnimatePresence>
                {addingToSet === set.name && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 flex gap-3 items-end">
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Rule #</label>
                        <input value={addForm.ruleNumber} onChange={e => setAddForm(f => ({ ...f, ruleNumber: e.target.value }))} placeholder="10" className="w-20 px-2 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Action</label>
                        <select value={addForm.action} onChange={e => setAddForm(f => ({ ...f, action: e.target.value }))} className="px-2 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                          <option value="accept">accept</option>
                          <option value="drop">drop</option>
                          <option value="reject">reject</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Description</label>
                        <input value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional" className="w-full px-2 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
                      </div>
                      <button onClick={() => addRule(set.name)} disabled={!addForm.ruleNumber} className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors disabled:opacity-50">Stage</button>
                      <button onClick={() => setAddingToSet(null)} className="px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors">✕</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {set.rules.length === 0 ? (
                <div className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900">No rules in this set</div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Rule</th>
                      <th className="px-4 py-2 text-left font-medium">Action</th>
                      <th className="px-4 py-2 text-left font-medium">Description</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {set.rules.map(rule => (
                      <tr key={rule.ruleNumber} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <td className="px-4 py-2 font-mono text-slate-700 dark:text-slate-300">{rule.ruleNumber}</td>
                        <td className="px-4 py-2">
                          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', rule.action === 'accept' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400')}>
                            {rule.action}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{rule.description ?? '—'}</td>
                        <td className="px-4 py-2">
                          <button onClick={() => deleteRule(set.name, rule.ruleNumber)} className="p-1 text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 transition-colors">
                            <Trash2 size={11} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Address and Network Groups */}
      {(Object.keys(groups.addressGroups).length > 0 || Object.keys(groups.networkGroups).length > 0) && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          {Object.keys(groups.addressGroups).length > 0 && (
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Address Groups</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {Object.entries(groups.addressGroups).map(([name, addrs]: [string, string[]]) => (
                  <div key={name} className="px-4 py-2.5 bg-white dark:bg-slate-900">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{name}</p>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">{addrs.join(', ')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {Object.keys(groups.networkGroups).length > 0 && (
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Network Groups</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {Object.entries(groups.networkGroups).map(([name, nets]: [string, string[]]) => (
                  <div key={name} className="px-4 py-2.5 bg-white dark:bg-slate-900">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{name}</p>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">{nets.join(', ')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
