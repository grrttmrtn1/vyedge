import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Search, Server, Layers, ArrowRight } from 'lucide-react';
import type { Router, RouterGroup, Tab } from '../../types';

interface Result {
  type: 'router' | 'group';
  id: string;
  label: string;
  sublabel: string;
  data: Router | RouterGroup;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  routers: Router[];
  groups: RouterGroup[];
  onTabChange: (tab: Tab) => void;
  onManageRouter: (r: Router) => void;
}

export function CommandPalette({ open, onClose, routers, groups, onTabChange, onManageRouter }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const results: Result[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return routers.slice(0, 5).map(r => ({
      type: 'router' as const,
      id: r.id,
      label: r.name,
      sublabel: r.url,
      data: r,
    }));
    const routerResults = routers
      .filter(r => r.name.toLowerCase().includes(q) || r.url.toLowerCase().includes(q))
      .map(r => ({ type: 'router' as const, id: r.id, label: r.name, sublabel: r.url, data: r }));
    const groupResults = groups
      .filter(g => g.name.toLowerCase().includes(q))
      .map(g => ({ type: 'group' as const, id: g.id, label: g.name, sublabel: 'Router Group', data: g }));
    return [...routerResults, ...groupResults].slice(0, 8);
  }, [query, routers, groups]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const handleSelect = useCallback((result: Result) => {
    if (result.type === 'router') {
      onTabChange('routers');
      onManageRouter(result.data as Router);
    } else {
      onTabChange('routers');
    }
    onClose();
  }, [onTabChange, onManageRouter, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex(i => Math.max(i - 1, 0));
      e.preventDefault();
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
        >
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-200 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 border-b border-slate-100">
              <Search size={16} className="text-slate-400 flex-shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search routers, groups…"
                className="flex-1 py-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
              />
              <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-400 flex-shrink-0">
                ESC
              </kbd>
            </div>

            {results.length > 0 && (
              <ul className="py-2 max-h-72 overflow-y-auto">
                {results.map((result, i) => (
                  <li key={result.id}>
                    <button
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        i === selectedIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        result.type === 'router' ? 'bg-slate-100' : 'bg-indigo-50'
                      }`}>
                        {result.type === 'router'
                          ? <Server size={14} className="text-slate-500" />
                          : <Layers size={14} className="text-indigo-500" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{result.label}</p>
                        <p className="text-xs text-slate-400 truncate">{result.sublabel}</p>
                      </div>
                      {i === selectedIndex && (
                        <ArrowRight size={14} className="text-indigo-400 flex-shrink-0" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {results.length === 0 && query.trim() && (
              <div className="py-10 text-center text-sm text-slate-400">
                No results for "{query}"
              </div>
            )}

            <div className="px-4 py-2.5 border-t border-slate-100 flex gap-4 text-[10px] text-slate-400 font-medium">
              <span>↑↓ navigate</span>
              <span>↵ select</span>
              <span>esc close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
