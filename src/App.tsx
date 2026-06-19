import React, { useState, useMemo } from 'react';
import { AnimatePresence } from 'motion/react';
import { useAuth } from './hooks/useAuth';
import { useRouters } from './hooks/useRouters';
import { useGroups } from './hooks/useGroups';
import { useLogs } from './hooks/useLogs';
import { useToast } from './hooks/useToast';
import { ToastContainer } from './components/ui/Toast';
import { Sidebar } from './components/layout/Sidebar';
import { LoginView } from './views/LoginView';
import { Dashboard } from './views/Dashboard';
import { Fleet } from './views/Fleet';
import { RouterManagement } from './views/RouterManagement';
import { ConfigTerminal } from './views/ConfigTerminal';
import { ConfigBrowser } from './views/ConfigBrowser';
import { Logs } from './views/Logs';
import { Users } from './views/Users';
import { Settings } from './views/Settings';
import type { Router } from './types';
import { Search, Activity } from 'lucide-react';

type Tab = 'dashboard' | 'routers' | 'config' | 'logs' | 'settings' | 'users' | 'browser';

export default function App() {
  const { token, user, login, logout, isAuthenticated } = useAuth();
  const { routers, fetchRouters } = useRouters(isAuthenticated);
  const { groups, fetchGroups } = useGroups(isAuthenticated);
  const { logs } = useLogs(isAuthenticated);
  const { toasts, toast, dismiss } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [managingRouter, setManagingRouter] = useState<Router | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const filteredRouters = useMemo(() =>
    searchQuery
      ? routers.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.url.toLowerCase().includes(searchQuery.toLowerCase()))
      : routers,
    [routers, searchQuery]
  );

  const handleLogin = async (username: string, password: string) => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      await login(username, password);
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        <LoginView onLogin={handleLogin} loading={loginLoading} error={loginError} />
        <ToastContainer toasts={toasts} onDismiss={dismiss} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex">
      <Sidebar user={user} activeTab={activeTab} onTabChange={tab => { setActiveTab(tab as Tab); setManagingRouter(null); }} onLogout={logout} />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 border-b border-zinc-200 bg-white flex items-center justify-between px-8 sticky top-0 z-20">
          <div className="flex flex-col">
            <h2 className="text-sm font-bold text-zinc-900 capitalize tracking-tight">{activeTab}</h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Vy Edge Manager • v2.5.0</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 transition-colors" size={14} />
              <input
                type="text"
                placeholder="Search infrastructure..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-11 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs focus:bg-white focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all w-80 font-medium"
              />
            </div>
            <div className="w-px h-8 bg-zinc-100" />
            <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-100">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-[0.15em]">System Online</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <Dashboard
                routers={routers}
                logs={logs}
                onAddNode={() => setActiveTab('routers')}
                onScan={() => { setActiveTab('logs'); toast.success('Audit scan initiated across all nodes.'); }}
                onSync={() => {
                  routers.forEach(r => fetch(`/api/routers/${r.id}/check`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }));
                  toast.success('Fleet synchronization started.');
                }}
                onExport={() => {
                  const csv = 'id,name,url,status\n' + routers.map(r => `${r.id},${r.name},${r.url},${r.status}`).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = 'fleet_export.csv'; a.click();
                }}
              />
            )}
            {activeTab === 'routers' && !managingRouter && (
              <Fleet
                routers={filteredRouters}
                groups={groups}
                onRefresh={fetchRouters}
                onRefreshGroups={fetchGroups}
                token={token!}
                onManage={setManagingRouter}
                currentUser={user!}
              />
            )}
            {activeTab === 'routers' && managingRouter && (
              <RouterManagement router={managingRouter} token={token!} onBack={() => setManagingRouter(null)} />
            )}
            {activeTab === 'config' && <ConfigTerminal routers={routers} token={token!} />}
            {activeTab === 'browser' && <ConfigBrowser routers={routers} token={token!} />}
            {activeTab === 'logs' && <Logs token={token!} />}
            {activeTab === 'users' && <Users token={token!} currentUser={user!} groups={groups} onRefreshRouters={fetchRouters} onRefreshGroups={fetchGroups} />}
            {activeTab === 'settings' && <Settings token={token!} />}
          </AnimatePresence>
        </div>
      </main>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
