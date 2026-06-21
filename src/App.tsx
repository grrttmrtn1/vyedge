import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { ThemeProvider } from './context/ThemeContext';
import { useAuth } from './hooks/useAuth';
import { useRouters } from './hooks/useRouters';
import { useGroups } from './hooks/useGroups';
import { useLogs } from './hooks/useLogs';
import { useToast } from './hooks/useToast';
import { ToastContainer } from './components/ui/Toast';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoginView } from './views/LoginView';
import { Dashboard } from './views/Dashboard';
import { Fleet } from './views/Fleet';
import { RouterManagement } from './views/RouterManagement';
import { ConfigTerminal } from './views/ConfigTerminal';
import { ConfigBrowser } from './views/ConfigBrowser';
import { Logs } from './views/Logs';
import { Users } from './views/Users';
import { Settings } from './views/Settings';
import type { Router, Tab } from './types';
import { routersApi } from './api/routers';

export default function App() {
  const { token, user, login, logout, isAuthenticated } = useAuth();
  const { routers, fetchRouters } = useRouters(isAuthenticated);
  const { groups, fetchGroups } = useGroups(isAuthenticated);
  const { logs } = useLogs(isAuthenticated);
  const { toasts, toast, dismiss } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [managingRouter, setManagingRouter] = useState<Router | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

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
    <ThemeProvider>
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar user={user} activeTab={activeTab} onTabChange={tab => { setActiveTab(tab as Tab); setManagingRouter(null); }} onLogout={logout} />

        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <Header
            activeTab={activeTab}
            managingRouter={managingRouter}
            routers={routers}
            groups={groups}
            onTabChange={tab => { setActiveTab(tab); setManagingRouter(null); }}
            onManageRouter={setManagingRouter}
          />

          <div className="flex-1 overflow-y-auto p-8">
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <Dashboard
                  routers={routers}
                  groups={groups}
                  logs={logs}
                  onAddNode={() => setActiveTab('routers')}
                  onScan={() => { setActiveTab('logs'); toast.success('Audit scan initiated across all nodes.'); }}
                  onSync={() => {
                    routers.forEach(r => routersApi.check(r.id).catch(() => {}));
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
                  routers={routers}
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
    </ThemeProvider>
  );
}
