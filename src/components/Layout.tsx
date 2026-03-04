import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Network, 
  Shield, 
  Lock, 
  FileText, 
  Users, 
  Activity, 
  LogOut,
  ChevronRight,
  Search,
  Bell,
  User as UserIcon
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion } from 'motion/react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const location = useLocation();

  const navItems = [
    { icon: <LayoutDashboard size={18} />, label: 'Dashboard', path: '/' },
    { icon: <Network size={18} />, label: 'Routes', path: '/routes' },
    { icon: <Shield size={18} />, label: 'Firewall', path: '/firewall' },
    { icon: <Lock size={18} />, label: 'VPN', path: '/vpn' },
    { icon: <FileText size={18} />, label: 'Configuration', path: '/config' },
    { icon: <Activity size={18} />, label: 'Audit Logs', path: '/logs' },
  ];

  if (user?.role === 'admin') {
    navItems.push({ icon: <Users size={18} />, label: 'User Admin', path: '/users' });
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-200 bg-white flex flex-col sticky top-0 h-screen">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-lg shadow-zinc-900/20">
            <Shield size={22} />
          </div>
          <div>
            <span className="font-bold text-zinc-900 tracking-tight block leading-none">Nexus Edge</span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Gateway v3.0</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                location.pathname === item.path 
                  ? "bg-zinc-900 text-white shadow-lg shadow-zinc-900/10" 
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              <span className={cn("transition-colors", location.pathname === item.path ? "text-white" : "text-zinc-400 group-hover:text-zinc-900")}>
                {item.icon}
              </span>
              {item.label}
              {location.pathname === item.path && (
                <motion.div layoutId="active-pill" className="ml-auto">
                  <ChevronRight size={14} />
                </motion.div>
              )}
            </Link>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-zinc-100">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 mb-3">
            <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-600">
              <UserIcon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-900 truncate">{user?.username}</p>
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{user?.role}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="h-16 border-b border-zinc-200 bg-white flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-widest">
              {navItems.find(i => i.path === location.pathname)?.label || 'Nexus Edge'}
            </h2>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
              <input 
                type="text" 
                placeholder="Search resources..." 
                className="pl-9 pr-4 py-1.5 bg-zinc-100 border-transparent rounded-full text-xs focus:bg-white focus:ring-2 focus:ring-zinc-900/5 transition-all w-64"
              />
            </div>
            <div className="flex items-center gap-4">
              <button className="text-zinc-400 hover:text-zinc-900 transition-colors relative">
                <Bell size={18} />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              </button>
              <div className="w-px h-6 bg-zinc-200" />
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Gateway Online</span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
};
