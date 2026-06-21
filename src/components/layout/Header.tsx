import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, ChevronRight, Command, Sun, Moon } from 'lucide-react';
import { CommandPalette } from './CommandPalette';
import { useTheme } from '../../context/ThemeContext';
import type { Router, RouterGroup, Tab } from '../../types';

const cn = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

const TAB_LABELS: Record<Tab, string> = {
  dashboard: 'Dashboard',
  routers: 'Fleet',
  config: 'Configuration',
  logs: 'Audit Logs',
  settings: 'System Settings',
  users: 'User Admin',
  browser: 'Config Browser',
};

interface HeaderProps {
  activeTab: Tab;
  managingRouter: Router | null;
  routers: Router[];
  groups: RouterGroup[];
  onTabChange: (tab: Tab) => void;
  onManageRouter: (r: Router) => void;
}

export function Header({ activeTab, managingRouter, routers, groups, onTabChange, onManageRouter }: HeaderProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const breadcrumb = (() => {
    const base = TAB_LABELS[activeTab];
    if (activeTab === 'routers' && managingRouter) {
      return (
        <div className="flex items-center gap-1.5 text-xl font-bold text-slate-900">
          <span className="text-slate-400 font-medium">{base}</span>
          <ChevronRight size={16} className="text-slate-300" />
          <span>{managingRouter.name}</span>
        </div>
      );
    }
    return <h2 className="text-xl font-bold text-slate-900">{base}</h2>;
  })();

  return (
    <>
      <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 sticky top-0 z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          {breadcrumb}
          <p className="text-xs text-slate-400 font-medium hidden sm:block">v2.5.0</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex items-center gap-2 pl-3 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400 hover:bg-white hover:border-slate-300 transition-all w-52 group"
          >
            <Search size={13} className="flex-shrink-0" />
            <span className="flex-1 text-left">Search…</span>
            <span className="flex items-center gap-0.5 text-[10px] font-medium opacity-60 group-hover:opacity-100">
              <Command size={9} />K
            </span>
          </button>

          <div className="w-px h-6 bg-slate-200" />

          <div ref={notifRef} className="relative">
            <button
              onClick={() => setNotifOpen(prev => !prev)}
              className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700"
            >
              <Bell size={16} />
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-900/10 overflow-hidden z-30">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-900">Notifications</p>
                </div>
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-slate-400">No new notifications</p>
                  <p className="text-xs text-slate-300 mt-1">Alerts appear here in Phase 4</p>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={toggle}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-xl border border-emerald-100">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">Online</span>
          </div>
        </div>
      </header>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        routers={routers}
        groups={groups}
        onTabChange={onTabChange}
        onManageRouter={onManageRouter}
      />
    </>
  );
}
