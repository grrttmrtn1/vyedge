import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Settings, 
  Shield, 
  Activity, 
  Plus, 
  Trash2, 
  Terminal, 
  LogOut, 
  Server, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Search,
  Lock,
  User,
  Database,
  Layers,
  Edit,
  RefreshCcw,
  FileText,
  Network,
  Globe,
  ShieldCheck,
  Cpu,
  Zap,
  Terminal as TerminalIcon,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Download,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

interface User {
  id: number;
  username: string;
  role: 'admin' | 'operator';
}

interface Router {
  id: number;
  name: string;
  url: string;
  status: string;
}

interface AuditLog {
  id: number;
  username: string;
  action: string;
  router_name: string;
  details: string;
  timestamp: string;
}

// --- Components ---

const Card = ({ children, className, title, subtitle }: { children: React.ReactNode; className?: string; title?: string; subtitle?: string }) => (
  <div className={cn("bg-white border border-zinc-200/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300", className)}>
    {title && (
      <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/30 flex flex-col gap-0.5">
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-900">{title}</h3>
        {subtitle && <p className="text-[10px] text-zinc-400 font-medium">{subtitle}</p>}
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className, 
  disabled,
  type = 'button',
  size = 'md'
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
  size?: 'sm' | 'md' | 'lg';
}) => {
  const variants = {
    primary: "bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm",
    secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
    outline: "bg-transparent text-zinc-900 border border-zinc-200 hover:bg-zinc-50",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-sm shadow-red-500/10",
    ghost: "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider",
    md: "px-4 py-2 text-sm font-semibold",
    lg: "px-6 py-3 text-base font-bold"
  };

  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={cn(
        "rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </button>
  );
};

const Input = ({ 
  label, 
  type = 'text', 
  value, 
  onChange, 
  placeholder,
  error
}: { 
  label?: string; 
  type?: string; 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
}) => (
  <div className="space-y-1">
    {label && <label className="text-xs font-medium text-zinc-600">{label}</label>}
    <input 
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={cn(
        "w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all",
        error && "border-red-500 focus:ring-red-500/10 focus:border-red-500"
      )}
    />
    {error && <p className="text-[10px] text-red-500 font-medium">{error}</p>}
  </div>
);

// --- Main App ---

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('vyos_token'));
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'routers' | 'config' | 'logs' | 'settings' | 'users' | 'browser' | 'map'>('dashboard');
  const [routers, setRouters] = useState<Router[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [managingRouter, setManagingRouter] = useState<Router | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRouters = useMemo(() => {
    if (!searchQuery) return routers;
    return routers.filter(r => 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.url.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [routers, searchQuery]);

  // Login State

  const fetchRouters = useCallback(async () => {
    try {
      const res = await fetch('/api/routers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setRouters(data);
    } catch {
      console.error("Failed to fetch routers");
    }
  }, [token]);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setLogs(data);
    } catch {
      console.error("Failed to fetch logs");
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchRouters();
      fetchLogs();
      // In a real app, we'd verify the token and get user info
      const savedUser = localStorage.getItem('vyos_user');
      if (savedUser) setUser(JSON.parse(savedUser));
    }
  }, [token, fetchRouters, fetchLogs]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('vyos_token', data.token);
        localStorage.setItem('vyos_user', JSON.stringify(data.user));
      } else {
        setError(data.error);
      }
    } catch {
      setError("Connection failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setLoginForm({ username: '', password: '' });
    localStorage.removeItem('vyos_token');
    localStorage.removeItem('vyos_user');
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-900 text-white mb-4 shadow-xl">
              <Shield size={32} />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Vy Edge Manager</h1>
            <p className="text-zinc-500 text-sm font-medium">Enterprise Network Intelligence</p>
          </div>

          <Card className="p-8 border-zinc-200/60 shadow-xl shadow-zinc-200/50">
            <form onSubmit={handleLogin} className="space-y-5">
              <Input 
                label="Corporate Identity" 
                value={loginForm.username} 
                onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                placeholder="Username"
              />
              <Input 
                label="Access Key" 
                type="password"
                value={loginForm.password} 
                onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                placeholder="••••••••"
              />
              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 text-red-600 bg-red-50/50 border border-red-100 p-3 rounded-xl text-xs font-semibold"
                >
                  <AlertCircle size={14} />
                  {error}
                </motion.div>
              )}
              <Button type="submit" className="w-full h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold tracking-wide transition-all active:scale-[0.98]" disabled={loading}>
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Activity size={16} className="animate-spin" />
                    <span>Verifying...</span>
                  </div>
                ) : "Authorize Access"}
              </Button>
            </form>
          </Card>
          
          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="flex items-center gap-6 opacity-40 grayscale">
              <Shield size={16} />
              <Lock size={16} />
              <Globe size={16} />
            </div>
            <p className="text-center text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em]">
              Secure Gateway • End-to-End Encryption • Audit Enabled
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex">
      {/* Sidebar */}
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
            onClick={() => setActiveTab('dashboard')} 
          />
          <NavItem 
            icon={<Server size={18} />} 
            label="Edge Fleet" 
            active={activeTab === 'routers'} 
            onClick={() => setActiveTab('routers')} 
          />
          <NavItem 
            icon={<Terminal size={18} />} 
            label="Configuration" 
            active={activeTab === 'config'} 
            onClick={() => setActiveTab('config')} 
          />
          <NavItem 
            icon={<Activity size={18} />} 
            label="Audit Logs" 
            active={activeTab === 'logs'} 
            onClick={() => setActiveTab('logs')} 
          />
          <NavItem 
            icon={<Database size={18} />} 
            label="Config Browser" 
            active={activeTab === 'browser'} 
            onClick={() => setActiveTab('browser')} 
          />
          {user?.role === 'admin' && (
            <>
              <NavItem 
                icon={<User size={18} />} 
                label="User Admin" 
                active={activeTab === 'users'} 
                onClick={() => setActiveTab('users')} 
              />
              <NavItem 
                icon={<Settings size={18} />} 
                label="System Settings" 
                active={activeTab === 'settings'} 
                onClick={() => setActiveTab('settings')} 
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
          <Button variant="ghost" className="w-full justify-start text-zinc-500" onClick={handleLogout}>
            <LogOut size={16} />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
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
            {activeTab === 'dashboard' && <DashboardView routers={routers} logs={logs} />}
            {activeTab === 'routers' && !managingRouter && <RoutersView routers={filteredRouters} onRefresh={fetchRouters} token={token!} onManage={setManagingRouter} />}
            {activeTab === 'routers' && managingRouter && (
              <RouterManagementView 
                router={managingRouter} 
                token={token!} 
                onBack={() => setManagingRouter(null)} 
              />
            )}
            {activeTab === 'config' && <ConfigView routers={routers} token={token!} />}
            {activeTab === 'browser' && <ConfigBrowserView routers={routers} token={token!} />}
            {activeTab === 'logs' && <LogsView logs={logs} />}
            {activeTab === 'users' && <UserAdminView token={token!} currentUser={user!} />}
            {activeTab === 'settings' && <SystemSettingsView token={token!} />}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function UserAdminView({ token, currentUser }: { token: string; currentUser: User }) {
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role: 'operator' as 'admin' | 'operator' | 'read-only' });
  const [groupForm, setGroupForm] = useState({ name: '' });
  const [resettingPassword, setResettingPassword] = useState<{ id: number; username: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [uRes, gRes] = await Promise.all([
          fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/router-groups', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setUsers(await uRes.json());
        setGroups(await gRes.json());
      } catch {
        console.error("Failed to fetch data");
      }
    };
    fetchData();
  }, [token]);

  const handleFetchData = useCallback(async () => {
    try {
      const [uRes, gRes] = await Promise.all([
        fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/router-groups', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setUsers(await uRes.json());
      setGroups(await gRes.json());
    } catch {
      console.error("Failed to fetch data");
    }
  }, [token]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      setShowAdd(false);
      setForm({ username: '', password: '', role: 'operator' });
      handleFetchData();
    } else {
      const data = await res.json();
      setError(data.error);
    }
  };

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/router-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(groupForm)
    });
    setGroupForm({ name: '' });
    fetchData();
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingPassword) return;
    setError(null);
    const res = await fetch(`/api/users/${resettingPassword.id}/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ password: newPassword })
    });
    if (res.ok) {
      setResettingPassword(null);
      setNewPassword('');
      alert("Password updated successfully");
    } else {
      const data = await res.json();
      setError(data.error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this user?")) return;
    await fetch(`/api/users/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    handleFetchData();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-zinc-900">User Administration</h3>
          <p className="text-sm text-zinc-500">Manage administrative access and roles.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowGroups(!showGroups)}>
            <Layers size={16} /> {showGroups ? 'View Users' : 'Manage Groups'}
          </Button>
          <Button onClick={() => setShowAdd(true)}><Plus size={16} /> Add User</Button>
        </div>
      </div>

      {showAdd && (
        <Card className="p-6 bg-zinc-50">
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <Input label="Username" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
            <div className="space-y-1">
              <Input label="Password" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
              <p className="text-[9px] text-zinc-400">Min 8 chars, 1 upper, 1 lower, 1 number, 1 special</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-600">Role</label>
              <select 
                value={form.role} 
                onChange={e => setForm({...form, role: e.target.value as any})}
                className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm"
              >
                <option value="operator">Operator</option>
                <option value="admin">Administrator</option>
                <option value="read-only">Read-Only</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">Create</Button>
              <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </form>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </Card>
      )}

      {resettingPassword && (
        <Card className="p-6 bg-zinc-50 border-zinc-900/20">
          <h4 className="text-sm font-bold mb-4">Reset Password for: {resettingPassword.username}</h4>
          <form onSubmit={handleResetPassword} className="flex gap-4 items-end">
            <div className="flex-1 space-y-1">
              <Input label="New Password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              <p className="text-[9px] text-zinc-400">Min 8 chars, 1 upper, 1 lower, 1 number, 1 special</p>
            </div>
            <div className="flex gap-2">
              <Button type="submit">Update Password</Button>
              <Button variant="secondary" onClick={() => { setResettingPassword(null); setNewPassword(''); setError(null); }}>Cancel</Button>
            </div>
          </form>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </Card>
      )}

      {showGroups ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card title="Router Groups">
            <form onSubmit={handleAddGroup} className="flex gap-2 mb-6">
              <Input value={groupForm.name} onChange={e => setGroupForm({ name: e.target.value })} placeholder="Group Name (e.g. EMEA Edge)" />
              <Button type="submit">Add Group</Button>
            </form>
            <div className="space-y-2">
              {groups.map(g => (
                <div key={g.id} className="flex items-center justify-between p-3 border border-zinc-100 rounded-xl bg-white">
                  <span className="text-sm font-bold text-zinc-900">{g.name}</span>
                  <span className="text-[10px] font-mono text-zinc-400">ID: {g.id}</span>
                </div>
              ))}
              {groups.length === 0 && <p className="text-center py-4 text-zinc-400 text-xs">No groups defined</p>}
            </div>
          </Card>
          <Card title="Group Assignments">
            <p className="text-xs text-zinc-500 mb-4 italic">Assignments are currently managed via direct database entry in this version. UI coming soon.</p>
          </Card>
        </div>
      ) : (
        <Card className="p-0">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Username</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Role</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {users.map(u => (
                <tr key={u.id}>
                  <td className="px-6 py-4 text-sm font-medium">{u.username}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      u.role === 'admin' ? "bg-zinc-900 text-white" : 
                      u.role === 'read-only' ? "bg-blue-100 text-blue-700" : "bg-zinc-100 text-zinc-600"
                    )}>{u.role}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Button variant="ghost" className="p-1 h-auto text-zinc-400 hover:text-zinc-900" onClick={() => setResettingPassword({ id: u.id, username: u.username })}>
                        <Lock size={14} />
                      </Button>
                      {u.id !== currentUser.id && (
                        <Button variant="ghost" className="p-1 h-auto text-zinc-400 hover:text-red-500" onClick={() => handleDelete(u.id)}>
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </motion.div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all group relative",
        active 
          ? "bg-zinc-900 text-white shadow-xl shadow-zinc-900/20" 
          : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
      )}
    >
      <span className={cn("transition-colors", active ? "text-white" : "text-zinc-400 group-hover:text-zinc-900")}>
        {icon}
      </span>
      {label}
      {active && (
        <motion.div 
          layoutId="nav-active"
          className="absolute left-0 w-1 h-6 bg-white rounded-full ml-1"
        />
      )}
    </button>
  );
}

// --- Views ---

function DashboardView({ routers, logs }: { routers: Router[]; logs: AuditLog[] }) {
  const stats = useMemo(() => ({
    total: routers.length,
    online: routers.filter(r => r.status === 'online').length,
    offline: routers.filter(r => r.status === 'offline' || r.status === 'unknown').length,
    recentActions: logs.length
  }), [routers, logs]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard 
          label="Total Edge Nodes" 
          value={stats.total} 
          icon={<Server className="text-zinc-900" />} 
        />
        <StatCard 
          label="Online Nodes" 
          value={stats.online} 
          icon={<CheckCircle2 className="text-emerald-500" />} 
        />
        <StatCard 
          label="Offline Nodes" 
          value={stats.offline} 
          icon={<AlertCircle className="text-red-500" />} 
        />
        <StatCard 
          label="Security Events" 
          value={stats.recentActions} 
          icon={<ShieldCheck className="text-amber-500" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card title="Active Edge Nodes">
            <div className="space-y-3">
              {routers.map(router => (
                <div key={router.id} className="flex items-center justify-between p-3 border border-zinc-100 rounded-xl bg-white hover:shadow-sm transition-all">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full ring-4 ring-offset-0",
                      router.status === 'online' ? "bg-emerald-500 ring-emerald-500/10" : 
                      router.status === 'offline' ? "bg-red-500 ring-red-500/10" : "bg-zinc-300 ring-zinc-300/10"
                    )} />
                    <div>
                      <span className="text-sm font-bold text-zinc-900 block">{router.name}</span>
                      <span className="text-[10px] font-mono text-zinc-400">{router.url}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest",
                      router.status === 'online' ? "bg-emerald-50 text-emerald-600" : 
                      router.status === 'offline' ? "bg-red-50 text-red-600" : "bg-zinc-50 text-zinc-400"
                    )}>{router.status}</div>
                  </div>
                </div>
              ))}
              {routers.length === 0 && (
                <div className="text-center py-8 text-zinc-400 text-sm">No routers connected</div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          <Card title="Quick Actions" subtitle="Common administrative tasks">
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" size="sm" className="flex-col py-4 h-auto gap-3 rounded-2xl">
                <Plus size={18} className="text-zinc-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Add Node</span>
              </Button>
              <Button variant="secondary" size="sm" className="flex-col py-4 h-auto gap-3 rounded-2xl">
                <ShieldCheck size={18} className="text-emerald-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Audit Scan</span>
              </Button>
              <Button variant="secondary" size="sm" className="flex-col py-4 h-auto gap-3 rounded-2xl">
                <RefreshCcw size={18} className="text-blue-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Sync Fleet</span>
              </Button>
              <Button variant="secondary" size="sm" className="flex-col py-4 h-auto gap-3 rounded-2xl">
                <Download size={18} className="text-zinc-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Export Data</span>
              </Button>
            </div>
          </Card>

          <Card title="Recent Security Audit">
            <div className="space-y-4">
              {logs.slice(0, 5).map(log => (
                <div key={log.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-100">
                  <div className="mt-1 w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500">
                    <TerminalIcon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900">
                      <span className="font-bold">{log.username}</span> <span className="text-zinc-500">executed</span> <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-[10px] font-bold text-zinc-700">{log.action}</code>
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{log.router_name || 'System'}</p>
                      <span className="text-zinc-300">•</span>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{new Date(log.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                </div>
              ))}
              {logs.length === 0 && <p className="text-center py-4 text-zinc-400 text-xs">No recent activity</p>}
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, trend, trendUp, icon, subtext }: { label: string; value: number | string; trend?: string; trendUp?: boolean; icon: React.ReactNode; subtext?: string }) {
  return (
    <Card className="relative overflow-hidden group border-zinc-200/60 hover:border-zinc-300 transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.15em] mb-2">{label}</p>
          <h3 className="text-2xl font-bold text-zinc-900 tracking-tight">{value}</h3>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trendUp !== undefined && (
                trendUp ? <ArrowUpRight size={12} className="text-emerald-500" /> : <ArrowDownRight size={12} className="text-red-500" />
              )}
              <span className={cn(
                "text-[10px] font-bold",
                trendUp === true ? "text-emerald-600" : trendUp === false ? "text-red-600" : "text-zinc-500"
              )}>{trend}</span>
              <span className="text-[10px] text-zinc-400 ml-1">vs last 24h</span>
            </div>
          )}
          {subtext && <p className="text-[10px] text-zinc-400 mt-1 font-medium">{subtext}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center border border-zinc-100 group-hover:scale-110 transition-transform">
          {icon}
        </div>
      </div>
    </Card>
  );
}

function RouterManagementView({ router, token, onBack }: { router: Router; token: string; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'interfaces' | 'routing' | 'firewall' | 'vpn' | 'services' | 'system' | 'terminal'>('interfaces');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tabs = useMemo(() => [
    { id: 'interfaces', label: 'Interfaces', icon: <Network size={16} />, path: ['interfaces'] },
    { id: 'routing', label: 'Routing', icon: <Globe size={16} />, path: ['protocols'] },
    { id: 'firewall', label: 'Firewall', icon: <ShieldCheck size={16} />, path: ['firewall'] },
    { id: 'vpn', label: 'VPN', icon: <Lock size={16} />, path: ['vpn'] },
    { id: 'services', label: 'Services', icon: <Zap size={16} />, path: ['service'] },
    { id: 'system', label: 'System', icon: <Cpu size={16} />, path: ['system'] },
    { id: 'terminal', label: 'Terminal', icon: <TerminalIcon size={16} />, path: null },
  ], []);

  const fetchData = useCallback(async (path: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/vyos/${router.id}/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ data: { op: 'showConfig', path } })
      });
      const result = await res.json();
      if (res.ok) {
        setData(result.data);
      } else {
        setError(result.details || "Failed to fetch data");
      }
    } catch {
      setError("Communication error");
    } finally {
      setLoading(false);
    }
  }, [router.id, token]);

  useEffect(() => {
    const tab = tabs.find(t => t.id === activeTab);
    if (tab && tab.path) {
      fetchData(tab.path);
    } else {
      setData(null);
    }
  }, [activeTab, fetchData, tabs]);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-sm">
        <div className="flex items-center gap-6">
          <Button variant="outline" onClick={onBack} className="w-10 h-10 p-0 rounded-xl">
            <ChevronRight className="rotate-180" size={20} />
          </Button>
          <div className="w-px h-10 bg-zinc-100" />
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-zinc-900 tracking-tight">{router.name}</h3>
              <div className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest",
                router.status === 'online' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
              )}>
                {router.status}
              </div>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">{router.url}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Last Sync</p>
            <p className="text-xs font-bold text-zinc-900">2 minutes ago</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => {
            const tab = tabs.find(t => t.id === activeTab);
            if (tab && tab.path) fetchData(tab.path);
          }}>
            <RefreshCcw size={14} className={cn(loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="flex gap-2 bg-zinc-100/50 p-1.5 rounded-2xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all",
              activeTab === tab.id 
                ? "bg-white text-zinc-900 shadow-md" 
                : "text-zinc-500 hover:text-zinc-900"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeTab === 'terminal' ? (
          <ConfigView routers={[router]} token={token} />
        ) : (
          <Card className="p-0 overflow-hidden bg-zinc-900 border-zinc-800 shadow-2xl">
            <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-zinc-700" />
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                  Path: {tabs.find(t => t.id === activeTab)?.path?.join(' / ')}
                </span>
              </div>
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500/20" />
                <div className="w-2 h-2 rounded-full bg-amber-500/20" />
                <div className="w-2 h-2 rounded-full bg-emerald-500/20" />
              </div>
            </div>
            <div className="p-8 min-h-[500px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-96 gap-6">
                  <div className="relative">
                    <Activity className="animate-spin text-zinc-700" size={48} />
                    <div className="absolute inset-0 animate-ping bg-zinc-700/10 rounded-full" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-zinc-400">Synchronizing State</p>
                    <p className="text-xs text-zinc-600 mt-1">Retrieving configuration from edge node...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-96 gap-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                    <AlertCircle className="text-red-500" size={32} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">Connection Interrupted</p>
                    <p className="text-sm text-zinc-500 mt-2 max-w-sm mx-auto">{error}</p>
                  </div>
                  <Button variant="outline" className="text-white border-zinc-700 hover:bg-zinc-800" onClick={() => {
                    const tab = tabs.find(t => t.id === activeTab);
                    if (tab && tab.path) fetchData(tab.path);
                  }}>Re-establish Connection</Button>
                </div>
              ) : (
                <div className="max-h-[700px] overflow-y-auto custom-scrollbar pr-4">
                  <ConfigNode data={data} path={tabs.find(t => t.id === activeTab)?.path || []} routerId={router.id} token={token} />
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </motion.div>
  );
}

function RoutersView({ routers, onRefresh, token, onManage }: { routers: Router[]; onRefresh: () => void; token: string; onManage: (r: Router) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState<Router | null>(null);
  const [showManageGroups, setShowManageGroups] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', api_key: '', group_id: '' });
  const [editForm, setEditForm] = useState({ name: '', url: '', api_key: '', group_id: '' });
  const [groups, setGroups] = useState<any[]>([]);
  const [groupForm, setGroupForm] = useState({ name: '' });
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState<number | null>(null);
  const [selectedRouter, setSelectedRouter] = useState<Router | null>(null);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/router-groups', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setGroups(data);
    } catch {
      console.error("Failed to fetch groups");
    }
  }, [token]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!form.name || !form.url || !form.api_key) {
      setError("All fields are required");
      return;
    }

    if (!form.url.startsWith('https://')) {
      setError("URL must start with https://");
      return;
    }

    // IP/Hostname validation
    try {
      const urlObj = new URL(form.url);
      if (!urlObj.hostname) throw new Error();
    } catch (e) {
      setError("Invalid URL format. Use https://IP_OR_HOSTNAME");
      return;
    }

    try {
      const res = await fetch('/api/routers', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        setShowAdd(false);
        setForm({ name: '', url: '', api_key: '', group_id: '' });
        onRefresh();
      } else {
        setError(data.error);
      }
    } catch {
      setError("Failed to add router");
    }
  };

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm.name) return;
    const res = await fetch('/api/router-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(groupForm)
    });
    if (res.ok) {
      setGroupForm({ name: '' });
      fetchGroups();
    } else {
      const data = await res.json();
      alert(data.error);
    }
  };

  const handleDeleteGroup = async (id: number) => {
    if (!confirm("Delete this group?")) return;
    const res = await fetch(`/api/router-groups/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      fetchGroups();
    } else {
      const data = await res.json();
      alert(data.error);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEdit) return;
    setError(null);
    
    try {
      const res = await fetch(`/api/routers/${showEdit.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (res.ok) {
        setShowEdit(null);
        onRefresh();
      } else {
        setError(data.error);
      }
    } catch {
      setError("Failed to update router");
    }
  };

  const openEdit = (router: Router) => {
    setShowEdit(router);
    setEditForm({ 
      name: router.name, 
      url: router.url, 
      api_key: '', // Don't show existing key for security
      group_id: router.group_id?.toString() || '' 
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to remove this router?")) return;
    try {
      const res = await fetch(`/api/routers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        onRefresh();
        if (selectedRouter?.id === id) setSelectedRouter(null);
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch {
      console.error("Failed to delete router");
    }
  };

  const checkStatus = async (id: number) => {
    setChecking(id);
    try {
      await fetch(`/api/routers/${id}/check`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      onRefresh();
    } finally {
      setChecking(null);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-zinc-900">Router Fleet</h3>
          <p className="text-sm text-zinc-500">Manage your VyOS instances across all tenants.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowManageGroups(!showManageGroups)}>
            <Layers size={16} />
            {showManageGroups ? 'View Routers' : 'Manage Groups'}
          </Button>
          <Button variant="secondary" onClick={() => routers.forEach(r => checkStatus(r.id))}>
            <Activity size={16} />
            Refresh All Status
          </Button>
          <Button onClick={() => setShowAdd(true)}>
            <Plus size={16} />
            Add Router
          </Button>
        </div>
      </div>

      {showAdd && (
        <Card className="p-6 border-zinc-900/10 bg-zinc-50/50">
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Edge-01" />
              <Input label="API URL" value={form.url} onChange={e => setForm({...form, url: e.target.value})} placeholder="https://10.0.0.1" />
              <Input label="API Key" type="password" value={form.api_key} onChange={e => setForm({...form, api_key: e.target.value})} placeholder="••••••••" />
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-600">Group</label>
                <select 
                  value={form.group_id}
                  onChange={e => setForm({...form, group_id: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm"
                >
                  <option value="">No Group</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            </div>
            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit">Save Router</Button>
            </div>
          </form>
        </Card>
      )}

      {showEdit && (
        <Card className="p-6 border-zinc-900/10 bg-zinc-50/50">
          <h4 className="text-sm font-bold mb-4">Edit Router: {showEdit.name}</h4>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Name" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Edge-01" />
              <Input label="API URL" value={editForm.url} onChange={e => setEditForm({...editForm, url: e.target.value})} placeholder="https://10.0.0.1" />
              <Input label="API Key (Leave blank to keep current)" type="password" value={editForm.api_key} onChange={e => setEditForm({...editForm, api_key: e.target.value})} placeholder="••••••••" />
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-600">Group</label>
                <select 
                  value={editForm.group_id}
                  onChange={e => setEditForm({...editForm, group_id: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm"
                >
                  <option value="">No Group</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            </div>
            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setShowEdit(null)}>Cancel</Button>
              <Button type="submit">Update Router</Button>
            </div>
          </form>
        </Card>
      )}

      {showManageGroups ? (
        <Card title="Infrastructure Groups" subtitle="Logical isolation for edge nodes">
          <div className="space-y-6">
            <form onSubmit={handleAddGroup} className="flex gap-3">
              <input 
                value={groupForm.name} 
                onChange={e => setGroupForm({ name: e.target.value })} 
                placeholder="New Group Name (e.g. US-EAST-1)" 
                className="flex-1 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:bg-white focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
              />
              <Button type="submit">Create Group</Button>
            </form>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map(g => (
                <div key={g.id} className="flex items-center justify-between p-5 border border-zinc-100 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all group">
                  <div>
                    <p className="text-sm font-bold text-zinc-900">{g.name}</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">ID: {g.id} • 0 Nodes</p>
                  </div>
                  <Button variant="ghost" className="p-2 h-auto text-zinc-300 group-hover:text-red-500" onClick={() => handleDeleteGroup(g.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
              {groups.length === 0 && <p className="text-center py-12 text-zinc-400 text-xs col-span-full font-medium italic">No infrastructure groups defined.</p>}
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {routers.map(router => (
            <Card key={router.id} className={cn("group transition-all relative", selectedRouter?.id === router.id && "ring-2 ring-zinc-900")}>
              <div className="flex items-start justify-between mb-6">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                  router.status === 'online' ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-400"
                )}>
                  <Server size={24} />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" className="p-2 h-auto" onClick={() => checkStatus(router.id)} disabled={checking === router.id}>
                    <Activity size={14} className={cn(checking === router.id && "animate-spin")} />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-2 h-auto" onClick={() => openEdit(router)}>
                    <Edit size={14} className="text-zinc-400 hover:text-zinc-900 transition-colors" />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-2 h-auto" onClick={() => handleDelete(router.id)}>
                    <Trash2 size={14} className="text-zinc-400 hover:text-red-500 transition-colors" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-zinc-900 tracking-tight">{router.name}</h4>
                <p className="text-[10px] text-zinc-400 font-mono tracking-wider">{router.url}</p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">CPU Load</p>
                  <p className="text-sm font-bold text-zinc-900">{router.status === 'online' ? '12%' : '--'}</p>
                </div>
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Uptime</p>
                  <p className="text-sm font-bold text-zinc-900">{router.status === 'online' ? '14d 2h' : '--'}</p>
                </div>
              </div>
              
              <div className="mt-6 flex items-center gap-3">
                <Button variant="primary" size="sm" className="flex-1 h-10 rounded-xl" onClick={() => onManage(router)}>
                  <TerminalIcon size={14} /> Console
                </Button>
                <Button variant="outline" size="sm" className="h-10 w-10 p-0 rounded-xl" onClick={() => setSelectedRouter(router)}>
                  <ChevronRight size={16} />
                </Button>
              </div>

              <div className="mt-6 pt-6 border-t border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full", 
                    router.status === 'online' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : 
                    router.status === 'offline' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-zinc-300"
                  )} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">{router.status}</span>
                </div>
                <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">v1.4.0-RC3</span>
              </div>
            </Card>
          ))}
          {routers.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300 mb-4">
                <Server size={32} />
              </div>
              <h3 className="text-lg font-bold text-zinc-900">No edge nodes found</h3>
              <p className="text-sm text-zinc-500 max-w-xs mt-1">Start by adding your first VyOS instance to the management fleet.</p>
              <Button onClick={() => setShowAdd(true)} className="mt-6">Add First Router</Button>
            </div>
          )}
        </div>
      )}

      {selectedRouter && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card title={`Router Details: ${selectedRouter.name}`} className="bg-zinc-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <DetailItem label="ID" value={selectedRouter.id} />
                <DetailItem label="Name" value={selectedRouter.name} />
                <DetailItem label="URL" value={selectedRouter.url} />
                <DetailItem label="Group ID" value={selectedRouter.group_id || 'None'} />
              </div>
              <div className="space-y-4">
                <DetailItem label="Status" value={selectedRouter.status} />
                <div className="pt-4">
                  <Button variant="secondary" className="w-full" onClick={() => setSelectedRouter(null)}>Close Details</Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

function DetailItem({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-medium text-zinc-900">{value}</p>
    </div>
  );
}

function ConfigBrowserView({ routers, token }: { routers: Router[]; token: string }) {
  const [selectedRouter, setSelectedRouter] = useState<number | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/vyos/${id}/show`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ data: { op: 'showConfig', path: [] } })
      });
      const result = await res.json();
      if (res.ok) {
        setConfig(result.data);
      } else {
        setError(result.error || "Failed to fetch config");
      }
    } catch {
      setError("Communication error");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (selectedRouter) fetchConfig(selectedRouter);
  }, [selectedRouter, fetchConfig]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-zinc-900">Configuration Browser</h3>
          <p className="text-sm text-zinc-500">Explore and manage the full VyOS configuration tree.</p>
        </div>
        <div className="w-64">
          <select 
            className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm"
            value={selectedRouter || ''}
            onChange={e => setSelectedRouter(Number(e.target.value))}
          >
            <option value="">Select Router...</option>
            {routers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Activity className="animate-spin text-zinc-400" size={32} />
        </div>
      )}

      {error && (
        <Card className="p-8 text-center text-red-500">
          <AlertCircle className="mx-auto mb-2" />
          <p className="text-sm font-medium">{error}</p>
        </Card>
      )}

      {config && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card title="Configuration Tree" className="p-0 overflow-hidden">
              <div className="max-h-[700px] overflow-y-auto p-4 bg-zinc-900">
                <ConfigNode data={config} path={[]} routerId={selectedRouter!} token={token} />
              </div>
            </Card>
          </div>
          <div className="space-y-6">
            <Card title="Quick Actions">
              <div className="space-y-2">
                <Button variant="secondary" className="w-full justify-start" onClick={() => fetchConfig(selectedRouter!)}>
                  <RefreshCcw size={14} className="mr-2" /> Refresh Tree
                </Button>
                <Button variant="secondary" className="w-full justify-start">
                  <FileText size={14} className="mr-2" /> Export JSON
                </Button>
              </div>
            </Card>
            <Card title="Help">
              <p className="text-xs text-zinc-500 leading-relaxed">
                This browser allows you to navigate the entire VyOS configuration. 
                Nodes with values can be edited directly. Changes are applied immediately to the router.
              </p>
            </Card>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function ConfigNode({ data, path, routerId, token }: { data: any; path: string[]; routerId: number; token: string }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const toggle = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async (key: string, value: string) => {
    const newPath = [...path, key];
    try {
      const res = await fetch(`/api/vyos/${routerId}/configure`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          data: { 
            op: 'set', 
            path: newPath,
            value: value
          } 
        })
      });
      if (res.ok) {
        setEditing(null);
        setAdding(false);
        setNewKey('');
        setNewValue('');
      } else {
        const err = await res.json();
        alert(err.details || "Failed to set value");
      }
    } catch (e) {
      alert("Communication error");
    }
  };

  if (typeof data !== 'object' || data === null) {
    return <span className="text-emerald-400 font-mono text-xs">{String(data)}</span>;
  }

  return (
    <div className="space-y-1 ml-6 border-l border-zinc-800/50 pl-6">
      {Object.entries(data).map(([key, value]) => {
        const isObject = typeof value === 'object' && value !== null;
        
        return (
          <div key={key} className="group">
            <div className="flex items-center gap-3 py-1 hover:bg-zinc-800/30 rounded-lg px-2 -ml-2 transition-colors">
              {isObject ? (
                <button onClick={() => toggle(key)} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                  {expanded[key] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              ) : (
                <div className="w-3.5" />
              )}
              
              <span className="text-zinc-500 font-mono text-xs font-bold">{key}</span>
              <span className="text-zinc-700 font-mono text-xs">:</span>
              
              {!isObject && (
                <div className="flex items-center gap-3">
                  {editing === key ? (
                    <div className="flex items-center gap-2">
                      <input 
                        className="bg-zinc-800 text-white text-xs px-2 py-1 rounded-md border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-48"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        autoFocus
                      />
                      <button onClick={() => handleSave(key, editValue)} className="text-emerald-500 hover:text-emerald-400 transition-colors"><CheckCircle2 size={14} /></button>
                      <button onClick={() => setEditing(null)} className="text-zinc-500 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 font-mono text-xs bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">{String(value)}</span>
                      <button 
                        onClick={() => { setEditing(key); setEditValue(String(value)); }}
                        className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-300 transition-all"
                      >
                        <Edit size={12} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {isObject && expanded[key] && (
              <ConfigNode data={value} path={[...path, key]} routerId={routerId} token={token} />
            )}
          </div>
        );
      })}
      
      <div className="mt-4">
        {adding ? (
          <div className="flex items-center gap-3 py-2 bg-zinc-800/20 rounded-xl px-4 border border-zinc-800/50">
            <input 
              placeholder="Key"
              className="bg-zinc-900 text-white text-xs px-2 py-1 rounded-md border border-zinc-700 w-32 focus:outline-none"
              value={newKey}
              onChange={e => setNewKey(e.target.value)}
            />
            <input 
              placeholder="Value (optional)"
              className="bg-zinc-900 text-white text-xs px-2 py-1 rounded-md border border-zinc-700 w-48 focus:outline-none"
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
            />
            <button onClick={() => handleSave(newKey, newValue)} className="text-emerald-500 hover:text-emerald-400"><CheckCircle2 size={14} /></button>
            <button onClick={() => setAdding(false)} className="text-red-500 hover:text-red-400"><Trash2 size={14} /></button>
          </div>
        ) : (
          <button 
            onClick={() => setAdding(true)}
            className="text-[10px] font-bold text-zinc-600 hover:text-zinc-300 flex items-center gap-2 transition-colors uppercase tracking-widest py-2"
          >
            <Plus size={12} /> Add Configuration Node
          </button>
        )}
      </div>
    </div>
  );
}
function ConfigView({ routers, token }: { routers: Router[]; token: string }) {
  const [selectedRouters, setSelectedRouters] = useState<number[]>([]);
  const [command, setCommand] = useState('');
  const [outputs, setOutputs] = useState<Record<number, any>>({});
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
    
    const executeOnRouter = async (routerId: number) => {
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

  const toggleRouter = (id: number) => {
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
          const router = routers.find(r => r.id === Number(routerId));
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

function LogsView({ logs }: { logs: AuditLog[] }) {
  const [expandedLog, setExpandedLog] = useState<number | null>(null);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-zinc-900">Global Audit Trail</h3>
          <p className="text-sm text-zinc-500">Immutable record of all administrative actions across the fleet.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm">
            <Download size={14} /> Export CSV
          </Button>
          <Button variant="secondary" size="sm">
            <Filter size={14} /> Advanced Filter
          </Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Timestamp</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Operator</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Action</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Target Node</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {logs.map((log, i) => (
                <React.Fragment key={log.id}>
                  <tr 
                    className={cn(
                      "hover:bg-zinc-50/50 transition-colors cursor-pointer",
                      expandedLog === log.id && "bg-zinc-50/80"
                    )}
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Clock size={12} className="text-zinc-300" />
                        <span className="text-xs font-mono text-zinc-500">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] font-bold text-zinc-500">
                          {log.username[0].toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-zinc-900">{log.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest",
                        log.action === 'LOGIN' ? "bg-blue-50 text-blue-600" :
                        log.action === 'CONFIGURE' ? "bg-amber-50 text-amber-600" :
                        log.action === 'DELETE' ? "bg-red-50 text-red-600" : "bg-zinc-100 text-zinc-600"
                      )}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-zinc-500">{log.router_name || 'System'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-zinc-400 truncate max-w-xs font-medium italic">"{log.details}"</p>
                        {expandedLog === log.id ? <ChevronUp size={14} className="text-zinc-300" /> : <ChevronDown size={14} className="text-zinc-300" />}
                      </div>
                    </td>
                  </tr>
                  {expandedLog === log.id && (
                    <tr className="bg-zinc-50/30">
                      <td colSpan={5} className="px-6 py-6">
                        <div className="bg-zinc-900 rounded-2xl p-6 shadow-inner">
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4">Payload Context</p>
                          <pre className="text-xs font-mono text-emerald-400/90 whitespace-pre-wrap leading-relaxed">
                            {(() => {
                              try {
                                return JSON.stringify(JSON.parse(log.details), null, 2);
                              } catch (e) {
                                return log.details;
                              }
                            })()}
                          </pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <ShieldCheck size={32} className="text-zinc-200" />
                      <p className="text-sm font-medium text-zinc-400 italic">No audit records found in the current period.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </motion.div>
  );
}

function SystemSettingsView({ token }: { token: string }) {
  const [settings, setSettings] = useState<any>({
    sso_enabled: false,
    sso_provider_url: '',
    sso_client_id: '',
    syslog_enabled: false,
    syslog_server: '',
    syslog_port: '514',
    syslog_proto: 'UDP',
    tenancy_enabled: true,
    audit_retention: '90'
  });
  const [sysInfo, setSysInfo] = useState<any>(null);

  useEffect(() => {
    fetch('/api/settings', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setSettings((prev: any) => ({ ...prev, ...data })));

    fetch('/api/system-info', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(setSysInfo);
  }, [token]);

  const updateSetting = async (key: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ key, value })
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card title="Core Configuration" subtitle="Global application parameters">
            <div className="space-y-8">
              <ToggleItem 
                title="Enterprise Single Sign-On (SSO)" 
                description="Enable SAML 2.0 / OIDC authentication for all operators."
                enabled={settings.sso_enabled}
                onToggle={() => updateSetting('sso_enabled', !settings.sso_enabled)}
              />
              <div className="h-px bg-zinc-100" />
              <div className="space-y-4">
                <label className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Centralized Syslog Endpoint</label>
                <div className="flex gap-3">
                  <input 
                    className="flex-1 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:bg-white focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all font-mono"
                    placeholder="syslog.internal.vyedge.com:514"
                    value={settings.syslog_server}
                    onChange={e => updateSetting('syslog_server', e.target.value)}
                  />
                  <Button variant="outline">Test Connection</Button>
                </div>
                <p className="text-[10px] text-zinc-400 font-medium italic">All edge node audit logs will be forwarded to this endpoint in real-time.</p>
              </div>
              <div className="h-px bg-zinc-100" />
              <div className="space-y-4">
                <label className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Audit Retention Policy</label>
                <select 
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:bg-white focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all font-medium"
                  value={settings.audit_retention}
                  onChange={e => updateSetting('audit_retention', e.target.value)}
                >
                  <option value="30">30 Days (Standard)</option>
                  <option value="90">90 Days (Compliance)</option>
                  <option value="365">1 Year (Long-term)</option>
                  <option value="0">Indefinite (High-Storage)</option>
                </select>
              </div>
            </div>
          </Card>

          <Card title="Security & Compliance" subtitle="Access control and data protection">
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-400">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900">Encryption at Rest</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">AES-256-GCM • Active</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">Manage Keys</Button>
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-400">
                    <Lock size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900">Session Management</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">24h Timeout • Multi-device</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">Configure</Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          <Card title="System Health" subtitle="Manager instance status">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">API Status</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-emerald-600">Operational</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Database</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-zinc-900">Healthy (4.2MB)</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Memory</span>
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-900">
                  {sysInfo ? '124MB / 512MB' : 'Loading...'}
                </div>
              </div>
              <div className="pt-4 border-t border-zinc-100">
                <Button variant="secondary" className="w-full">
                  <RefreshCcw size={14} /> Restart Services
                </Button>
              </div>
            </div>
          </Card>

          <Card title="Backup & Recovery" subtitle="Automated snapshots">
            <div className="space-y-6">
              <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Last Backup</p>
                <p className="text-sm font-bold text-white">Today, 04:00 AM</p>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 text-white border-zinc-700 hover:bg-zinc-800">Restore</Button>
                  <Button variant="primary" size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-500">Backup Now</Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}

function ToggleItem({ title, description, enabled, onToggle, children }: { title: string; description: string; enabled: boolean; onToggle: () => void; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-start justify-between">
        <div className="flex-1 pr-8">
          <h5 className="text-sm font-bold text-zinc-900">{title}</h5>
          <p className="text-xs text-zinc-500 mt-1">{description}</p>
        </div>
        <div 
          onClick={onToggle}
          className={cn(
            "w-10 h-5 rounded-full relative transition-colors cursor-pointer",
            enabled ? "bg-zinc-900" : "bg-zinc-200"
          )}
        >
          <div className={cn(
            "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
            enabled ? "right-1" : "left-1"
          )} />
        </div>
      </div>
      {children}
    </div>
  );
}
