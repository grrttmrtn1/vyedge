import React from 'react';
import { LayoutDashboard, Settings, Shield, Terminal, Activity, Server, Database, User, LogOut } from 'lucide-react';
import { NavItem } from './NavItem';
import { Button } from '../ui/Button';
import type { User as UserType } from '../../types';

interface SidebarProps {
  user: UserType | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

export function Sidebar({ user, activeTab, onTabChange, onLogout }: SidebarProps) {
  return (
    <aside className="w-64 border-r border-zinc-200 bg-white flex flex-col">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-white shadow-lg shadow-zinc-900/20">
          <Shield size={18} />
        </div>
        <span className="font-bold text-zinc-900 tracking-tight text-lg">Vy Edge</span>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <NavItem
          icon={<LayoutDashboard size={18} />}
          label="Dashboard"
          active={activeTab === 'dashboard'}
          onClick={() => onTabChange('dashboard')}
        />
        <NavItem
          icon={<Server size={18} />}
          label="Edge Fleet"
          active={activeTab === 'routers'}
          onClick={() => onTabChange('routers')}
        />
        <NavItem
          icon={<Terminal size={18} />}
          label="Configuration"
          active={activeTab === 'config'}
          onClick={() => onTabChange('config')}
        />
        <NavItem
          icon={<Activity size={18} />}
          label="Audit Logs"
          active={activeTab === 'logs'}
          onClick={() => onTabChange('logs')}
        />
        <NavItem
          icon={<Database size={18} />}
          label="Config Browser"
          active={activeTab === 'browser'}
          onClick={() => onTabChange('browser')}
        />
        {user?.role === 'admin' && (
          <>
            <NavItem
              icon={<User size={18} />}
              label="User Admin"
              active={activeTab === 'users'}
              onClick={() => onTabChange('users')}
            />
            <NavItem
              icon={<Settings size={18} />}
              label="System Settings"
              active={activeTab === 'settings'}
              onClick={() => onTabChange('settings')}
            />
          </>
        )}
      </nav>

      <div className="p-4 mt-auto border-t border-zinc-100">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 mb-3">
          <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-600">
            <User size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-zinc-900 truncate">{user?.username}</p>
            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{user?.role}</p>
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start text-zinc-500" onClick={onLogout}>
          <LogOut size={16} />
          Logout
        </Button>
      </div>
    </aside>
  );
}
