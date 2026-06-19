import React, { useState, useEffect } from 'react';
import { Terminal } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import type { Router } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ConfigTerminalProps {
  routers: Router[];
  token: string;
}

export function ConfigTerminal({ routers, token }: ConfigTerminalProps) {
  const [selectedRouters, setSelectedRouters] = useState<string[]>([]);
  const [command, setCommand] = useState('');
  const [outputs, setOutputs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (routers.length === 1) {
      setSelectedRouters([routers[0].id]);
    }
  }, [routers]);

  const handleExecute = async (action: 'configure' | 'show' | 'op') => {
    if (selectedRouters.length === 0) return alert("Select at least one router");
    if (!command) return alert("Enter a command path");

    setLoading(true);
    setOutputs({});

    const executeOnRouter = async (routerId: string) => {
      try {
        let op = 'set';
        if (action === 'show') op = 'showConfig';
        if (action === 'op') op = 'run';

        const data = {
          op,
          path: command.trim().split(/\s+/)
        };

        const res = await fetch(`/api/vyos/${routerId}/${action}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ data })
        });
        const result = await res.json();
        return { routerId, result };
      } catch (err: any) {
        return { routerId, result: { error: "Execution failed", details: err.message } };
      }
    };

    try {
      const results = await Promise.all(selectedRouters.map(executeOnRouter));
      const newOutputs: Record<number, any> = {};
      results.forEach(r => {
        newOutputs[r.routerId] = r.result;
      });
      setOutputs(newOutputs);
    } finally {
      setLoading(false);
    }
  };

  const toggleRouter = (id: string) => {
    setSelectedRouters(prev =>
      prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-zinc-900">Remote Configuration</h3>
          <p className="text-sm text-zinc-500">Execute commands across your fleet securely.</p>
        </div>
      </div>

      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-600">Target Routers ({selectedRouters.length} selected)</label>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-zinc-100 rounded-lg bg-zinc-50/50">
            {routers.map(r => (
              <button
                key={r.id}
                onClick={() => toggleRouter(r.id)}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border",
                  selectedRouters.includes(r.id)
                    ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                    : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
                )}
              >
                {r.name}
              </button>
            ))}
            {routers.length === 0 && <p className="text-[10px] text-zinc-400 p-2">No routers available</p>}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="text-[10px] p-0 h-auto" onClick={() => setSelectedRouters(routers.map(r => r.id))}>Select All</Button>
            <Button variant="ghost" className="text-[10px] p-0 h-auto" onClick={() => setSelectedRouters([])}>Clear Selection</Button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-600">Quick Templates</label>
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" className="text-[10px] py-1 px-2 h-auto" onClick={() => setCommand('interfaces')}>Interfaces</Button>
            <Button variant="secondary" className="text-[10px] py-1 px-2 h-auto" onClick={() => setCommand('system ntp')}>NTP</Button>
            <Button variant="secondary" className="text-[10px] py-1 px-2 h-auto" onClick={() => setCommand('protocols static')}>Static</Button>
            <Button variant="secondary" className="text-[10px] py-1 px-2 h-auto" onClick={() => setCommand('show interfaces')}>Show Ints</Button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-600">Command Path (Space separated)</label>
          <div className="relative">
            <Terminal className="absolute left-3 top-3 text-zinc-400" size={16} />
            <textarea
              value={command}
              onChange={e => setCommand(e.target.value)}
              placeholder="interfaces ethernet eth0 address 192.168.1.1/24"
              className="w-full pl-10 pr-4 py-3 bg-zinc-900 text-zinc-100 font-mono text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-500/20 min-h-[100px]"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={() => handleExecute('show')} disabled={loading} variant="secondary">
            {loading ? 'Executing...' : 'Show Config'}
          </Button>
          <Button onClick={() => handleExecute('configure')} disabled={loading}>
            {loading ? 'Executing...' : 'Set Configuration'}
          </Button>
          <Button onClick={() => handleExecute('op')} disabled={loading} variant="ghost">
            {loading ? 'Executing...' : 'Operational Cmd'}
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        {Object.entries(outputs).map(([routerId, output]) => {
          const router = routers.find(r => r.id === routerId);
          return (
            <Card key={routerId} title={`Output: ${router?.name || routerId}`} className="bg-zinc-900 border-zinc-800">
              <div className="max-h-[300px] overflow-y-auto">
                <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap">
                  {typeof output === 'string' ? output : JSON.stringify(output, null, 2)}
                </pre>
              </div>
            </Card>
          );
        })}
      </div>
    </motion.div>
  );
}
