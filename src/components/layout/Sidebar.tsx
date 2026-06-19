import React from 'react';
import {
  LayoutDashboard,
  Settings,
  Terminal,
  Activity,
  Server,
  Database,
  User,
  LogOut,
  Zap,
} from 'lucide-react';
import { NavItem } from './NavItem';
import type { User as UserType } from '../../types';

interface SidebarProps {
  user: UserType | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

function getRoleBadgeClass(role: string): string {
  if (role === 'admin') return 'bg-indigo-500/20 text-indigo-300';
  if (role === 'operator') return 'bg-amber-500/20 text-amber-300';
  return 'bg-slate-500/20 text-slate-300';
}

function getInitials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

export function Sidebar({ user, activeTab, onTabChange, onLogout }: SidebarProps) {
  return (
    <aside className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col flex-shrink-0">
      <div className="h-16 px-5 flex items-center gap-3 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/50 flex-shrink-0">
          <Zap size={16} className="text-white" />
        </div>
        <span className="font-bold text-white tracking-tight text-base">Vy Edge</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <NavItem
          icon={<LayoutDashboard size={16} />}
          label="Dashboard"
          active={activeTab === 'dashboard'}
          onClick={() => onTabChange('dashboard')}
        />
        <NavItem
          icon={<Server size={16} />}
          label="Edge Fleet"
          active={activeTab === 'routers'}
          onClick={() => onTabChange('routers')}
        />
        <NavItem
          icon={<Terminal size={16} />}
          label="Configuration"
          active={activeTab === 'config'}
          onClick={() => onTabChange('config')}
        />
        <NavItem
          icon={<Activity size={16} />}
          label="Audit Logs"
          active={activeTab === 'logs'}
          onClick={() => onTabChange('logs')}
        />
        <NavItem
          icon={<Database size={16} />}
          label="Config Browser"
          active={activeTab === 'browser'}
          onClick={() => onTabChange('browser')}
        />
        {user?.role === 'admin' && (
          <>
            <NavItem
              icon={<User size={16} />}
              label="User Admin"
              active={activeTab === 'users'}
              onClick={() => onTabChange('users')}
            />
            <NavItem
              icon={<Settings size={16} />}
              label="System Settings"
              active={activeTab === 'settings'}
              onClick={() => onTabChange('settings')}
            />
          </>
        )}
      </nav>

      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-white/5 mb-2">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user ? getInitials(user.username) : '??'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.username}</p>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded inline-block mt-0.5 ${getRoleBadgeClass(user?.role ?? 'viewer')}`}>
              {user?.role}
            </span>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg text-sm font-medium transition-all"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
