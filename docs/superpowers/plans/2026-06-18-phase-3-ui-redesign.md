# Phase 3 — UI Redesign: Modern SaaS Light — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current monochrome zinc UI with the spec's "Vercel/Linear" split — dark `slate-900→slate-800` sidebar, light `slate-50` content, indigo primary, emerald/rose/amber semantic colors, sparklines, command palette, and polished micro-interactions.

**Architecture:** All changes are purely frontend (no server or test files modified). Each task targets a specific layer: CSS base → UI primitives → layout chrome → view-by-view redesign. The sidebar is the single biggest change; all subsequent tasks build on its color vocabulary.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, `motion/react`, Recharts (sparklines), Lucide React, clsx/tailwind-merge.

## Global Constraints

- `motion/react` — NOT `framer-motion`. Import `motion`, `AnimatePresence`, `useAnimate` from `'motion/react'`.
- Tailwind CSS v4 — utility classes only; no custom CSS beyond what's in `src/index.css`.
- Color system (exact tokens to use verbatim throughout):
  - Primary: `indigo-600` buttons / `indigo-500` hover / `indigo-400` on dark bg
  - Success: `emerald-500`
  - Warning: `amber-500`
  - Danger: `rose-500`
  - Surface BG: `slate-50`
  - Card: `white`
  - Border: `slate-200`
  - Text primary: `slate-900`
  - Text secondary: `slate-500`
  - Text muted: `slate-400`
  - Sidebar: `from-slate-900 to-slate-800` (gradient)
- `cn()` remains a local 3-line helper in every file — do NOT create a shared utility.
- No new npm packages — recharts, motion/react, lucide-react, clsx, tailwind-merge are all already installed.
- After every task: `npx tsc --noEmit` must report 0 errors; `npx vitest run` must report 15/15 tests passing.
- Do NOT modify any file under `server/`, `tests/`, or `src/api/` or `src/hooks/`.

---

### Task 1: Dark Sidebar + Base CSS

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/layout/NavItem.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: `User` from `src/types.ts`; `NavItem` props unchanged; `Sidebar` props unchanged
- Produces: `Sidebar` now renders dark gradient; `NavItem` uses indigo left-border active indicator

- [ ] **Step 1: Update `src/index.css` base styles**

Replace the entire file contents with:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
}

@layer base {
  body {
    @apply font-sans text-slate-900 antialiased bg-slate-50;
  }
}

.data-row {
  @apply transition-all duration-200;
}

.data-row:hover {
  @apply bg-slate-50;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  @apply bg-transparent;
}

::-webkit-scrollbar-thumb {
  @apply bg-slate-200 rounded-full;
}

::-webkit-scrollbar-thumb:hover {
  @apply bg-slate-300;
}
```

- [ ] **Step 2: Rewrite `src/components/layout/NavItem.tsx`**

Replace the entire file contents with:

```tsx
import React from 'react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function NavItem({ icon, label, active, onClick }: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative group",
        active
          ? "text-white bg-white/10"
          : "text-slate-400 hover:text-white hover:bg-white/5"
      )}
    >
      {active && (
        <motion.div
          layoutId="nav-active"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-400 rounded-full"
        />
      )}
      <span className={cn(
        "transition-colors flex-shrink-0",
        active ? "text-white" : "text-slate-400 group-hover:text-slate-200"
      )}>
        {icon}
      </span>
      {label}
    </button>
  );
}

export { NavItem };
```

- [ ] **Step 3: Rewrite `src/components/layout/Sidebar.tsx`**

Replace the entire file contents with:

```tsx
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
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors. If any errors, fix before continuing.

- [ ] **Step 5: Run tests**

```bash
npx vitest run
```

Expected: `Tests 15 passed (15)`. Server-side tests are unaffected by UI changes.

- [ ] **Step 6: Commit**

```bash
git add src/index.css src/components/layout/NavItem.tsx src/components/layout/Sidebar.tsx
git commit -m "feat: dark sidebar — slate-900/800 gradient, indigo active indicator, initials avatar"
```

---

### Task 2: UI Primitives — Button, Input, Card, Select

**Files:**
- Modify: `src/components/ui/Button.tsx`
- Modify: `src/components/ui/Input.tsx`
- Modify: `src/components/ui/Card.tsx`
- Create: `src/components/ui/Select.tsx`
- Modify: `src/components/ui/index.ts`

**Interfaces:**
- Consumes: nothing new
- Produces:
  - `Button`: primary is now `indigo-600`; danger is `rose-500`; `active:scale-[0.97]`
  - `Input`: focus ring `indigo-500/20`, border `indigo-500`
  - `Card`: adds `hover:-translate-y-0.5` lift
  - `Select`: new component — `{ label?, value, onChange, options: {value,label}[], placeholder?, error? }`

- [ ] **Step 1: Rewrite `src/components/ui/Button.tsx`**

Replace the entire file contents with:

```tsx
import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Button = ({
  children,
  onClick,
  variant = 'primary',
  className,
  disabled,
  type = 'button',
  size = 'md',
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
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-600/20',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
    outline: 'bg-transparent text-slate-900 border border-slate-200 hover:bg-slate-50',
    danger: 'bg-rose-500 text-white hover:bg-rose-600 shadow-sm shadow-rose-500/10',
    ghost: 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider',
    md: 'px-4 py-2 text-sm font-semibold',
    lg: 'px-6 py-3 text-base font-bold',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </button>
  );
};

export { Button };
```

- [ ] **Step 2: Rewrite `src/components/ui/Input.tsx`**

Replace the entire file contents with:

```tsx
import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Input = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  disabled,
}: {
  label?: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}) => (
  <div className="space-y-1">
    {label && (
      <label className="text-xs font-medium text-slate-600">{label}</label>
    )}
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed',
        error && 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500'
      )}
    />
    {error && (
      <p className="text-[10px] text-rose-500 font-medium">{error}</p>
    )}
  </div>
);

export { Input };
```

- [ ] **Step 3: Update `src/components/ui/Card.tsx` — add translate hover**

Find the line:
```tsx
const Card = ({ children, className, title, subtitle }: CardProps) => (
  <div className={cn("bg-white border border-zinc-200/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300", className)}>
```

Replace it with:
```tsx
const Card = ({ children, className, title, subtitle }: CardProps) => (
  <div className={cn("bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200", className)}>
```

Also update the title header section — find:
```tsx
      <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/30 flex flex-col gap-0.5">
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-900">{title}</h3>
        {subtitle && <p className="text-[10px] text-zinc-400 font-medium">{subtitle}</p>}
```

Replace with:
```tsx
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30 flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 font-medium">{subtitle}</p>}
```

- [ ] **Step 4: Create `src/components/ui/Select.tsx`**

```tsx
import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Select = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  disabled,
}: {
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}) => (
  <div className="space-y-1">
    {label && (
      <label className="text-xs font-medium text-slate-600">{label}</label>
    )}
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={cn(
          'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500'
        )}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
    {error && (
      <p className="text-[10px] text-rose-500 font-medium">{error}</p>
    )}
  </div>
);

export { Select };
```

- [ ] **Step 5: Update `src/components/ui/index.ts`** to export Select:

Replace the entire file contents with:

```ts
export { Button } from './Button';
export { Card } from './Card';
export { Input } from './Input';
export { Select } from './Select';
export { ToastContainer } from './Toast';
export { ConfirmModal } from './ConfirmModal';
```

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 7: Run tests**

```bash
npx vitest run
```

Expected: `Tests 15 passed (15)`.

- [ ] **Step 8: Commit**

```bash
git add src/components/ui/Button.tsx src/components/ui/Input.tsx src/components/ui/Card.tsx src/components/ui/Select.tsx src/components/ui/index.ts
git commit -m "feat: ui primitives — indigo primary, rose danger, indigo focus rings, card hover lift, Select component"
```

---

### Task 3: Header Component + Command Palette

**Files:**
- Modify: `src/types.ts`
- Create: `src/components/layout/Header.tsx`
- Create: `src/components/layout/CommandPalette.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `Router`, `RouterGroup` from `src/types.ts`; `Tab` (moved to `src/types.ts`)
- Produces:
  - `Header` props: `{ activeTab: Tab; managingRouter: Router | null; routers: Router[]; groups: RouterGroup[]; onTabChange: (tab: Tab) => void; onManageRouter: (r: Router) => void; }`
  - `CommandPalette` props: `{ open: boolean; onClose: () => void; routers: Router[]; groups: RouterGroup[]; onTabChange: (tab: Tab) => void; onManageRouter: (r: Router) => void; }`

- [ ] **Step 1: Add `Tab` type to `src/types.ts`**

Append to the bottom of `src/types.ts`:

```ts
export type Tab = 'dashboard' | 'routers' | 'config' | 'logs' | 'settings' | 'users' | 'browser';
```

- [ ] **Step 2: Create `src/components/layout/CommandPalette.tsx`**

```tsx
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
```

- [ ] **Step 3: Create `src/components/layout/Header.tsx`**

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, ChevronRight, Command } from 'lucide-react';
import { CommandPalette } from './CommandPalette';
import type { Router, RouterGroup, Tab } from '../../types';

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
```

- [ ] **Step 4: Update `src/App.tsx`** — import `Tab` from types, import `Header`, replace inline header with `<Header />`

Find and replace the line:
```tsx
type Tab = 'dashboard' | 'routers' | 'config' | 'logs' | 'settings' | 'users' | 'browser';
```
with:
```tsx
import type { Tab } from './types';
```

Add import for Header (near the other layout imports):
```tsx
import { Header } from './components/layout/Header';
```

Remove the `Search` import from lucide-react since it's no longer used in App.tsx:
```tsx
import { Search } from 'lucide-react';  // DELETE this line
```

Replace the entire inline `<header>` block (from `<header className="h-20...">` to its closing `</header>`) with:
```tsx
        <Header
          activeTab={activeTab}
          managingRouter={managingRouter}
          routers={routers}
          groups={groups}
          onTabChange={tab => { setActiveTab(tab); setManagingRouter(null); }}
          onManageRouter={setManagingRouter}
        />
```

Also remove the `searchQuery` and `filteredRouters` state/memo from App.tsx since search now lives in the command palette. Replace `filteredRouters` with `routers` wherever it's passed to `<Fleet>`:
- Remove: `const [searchQuery, setSearchQuery] = useState('');`
- Remove: `const filteredRouters = useMemo(...)`
- Change: `routers={filteredRouters}` → `routers={routers}` in the Fleet render

Also update the outer div background:
```tsx
<div className="min-h-screen bg-[#F8F9FA] flex">
```
to:
```tsx
<div className="min-h-screen bg-slate-50 flex">
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Run tests**

```bash
npx vitest run
```

Expected: `Tests 15 passed (15)`.

- [ ] **Step 7: Commit**

```bash
git add src/types.ts src/components/layout/Header.tsx src/components/layout/CommandPalette.tsx src/App.tsx
git commit -m "feat: header component with breadcrumb, notification bell, Cmd+K command palette"
```

---

### Task 4: Dashboard Redesign

**Files:**
- Modify: `src/views/Dashboard.tsx`
- Modify: `src/App.tsx` (add `groups` prop to `<Dashboard>`)

**Interfaces:**
- Consumes: `Router`, `RouterGroup`, `AuditLog` from `src/types.ts`; `Card`, `Button` from `../components/ui/`; `AreaChart`, `Area`, `ResponsiveContainer` from `recharts`
- Produces: `DashboardProps` gains `groups: RouterGroup[]`; `StatCard` gains optional `sparkValues?: number[]`

- [ ] **Step 1: Update `src/App.tsx` to pass `groups` to Dashboard**

Find the Dashboard render:
```tsx
              <Dashboard
                routers={routers}
                logs={logs}
                onAddNode={...}
```

Add `groups={groups}` as a prop:
```tsx
              <Dashboard
                routers={routers}
                groups={groups}
                logs={logs}
                onAddNode={...}
```

- [ ] **Step 2: Rewrite `src/views/Dashboard.tsx`**

Replace the entire file contents with:

```tsx
import React, { useMemo } from 'react';
import {
  Server,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Plus,
  RefreshCcw,
  Download,
} from 'lucide-react';
import { motion } from 'motion/react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import type { Router, RouterGroup, AuditLog } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function actionBorderColor(action: string): string {
  const a = action.toLowerCase();
  if (a.includes('login') || a.includes('auth')) return 'border-l-indigo-500';
  if (a.includes('delete') || a.includes('remove')) return 'border-l-rose-500';
  if (a.includes('add') || a.includes('create') || a.includes('register')) return 'border-l-emerald-500';
  return 'border-l-amber-500';
}

function actionDotColor(action: string): string {
  const a = action.toLowerCase();
  if (a.includes('login') || a.includes('auth')) return 'bg-indigo-500';
  if (a.includes('delete') || a.includes('remove')) return 'bg-rose-500';
  if (a.includes('add') || a.includes('create') || a.includes('register')) return 'bg-emerald-500';
  return 'bg-amber-500';
}

interface DashboardProps {
  routers: Router[];
  groups: RouterGroup[];
  logs: AuditLog[];
  onAddNode: () => void;
  onScan: () => void;
  onSync: () => void;
  onExport: () => void;
}

export function Dashboard({ routers, groups, logs, onAddNode, onScan, onSync, onExport }: DashboardProps) {
  const stats = useMemo(() => ({
    total: routers.length,
    online: routers.filter(r => r.status === 'online').length,
    offline: routers.filter(r => r.status === 'offline' || r.status === 'unknown').length,
    recentActions: logs.length,
  }), [routers, logs]);

  // Group routers by their group_id for the fleet health grid
  const routersByGroup = useMemo(() => {
    const map: { label: string; routers: Router[] }[] = [];
    groups.forEach(g => {
      const members = routers.filter(r => r.group_id === g.id);
      if (members.length > 0) map.push({ label: g.name, routers: members });
    });
    const ungrouped = routers.filter(r => !r.group_id);
    if (ungrouped.length > 0) map.push({ label: 'Ungrouped', routers: ungrouped });
    return map;
  }, [routers, groups]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      {/* Stat cards with sparklines */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          label="Total Edge Nodes"
          value={stats.total}
          icon={<Server className="text-slate-600" size={18} />}
          iconBg="bg-slate-100"
          sparkValues={[1, 1, 2, 2, 2, stats.total, stats.total]}
          sparkColor="#6366f1"
        />
        <StatCard
          label="Online Nodes"
          value={stats.online}
          icon={<CheckCircle2 className="text-emerald-500" size={18} />}
          iconBg="bg-emerald-50"
          sparkValues={[0, 1, 1, stats.online, stats.online, stats.online, stats.online]}
          sparkColor="#10b981"
        />
        <StatCard
          label="Offline / Unknown"
          value={stats.offline}
          icon={<AlertCircle className="text-rose-500" size={18} />}
          iconBg="bg-rose-50"
          sparkValues={[stats.offline, stats.offline, 0, 0, stats.offline, 0, stats.offline]}
          sparkColor="#f43f5e"
        />
        <StatCard
          label="Security Events"
          value={stats.recentActions}
          icon={<ShieldCheck className="text-amber-500" size={18} />}
          iconBg="bg-amber-50"
          sparkValues={[2, 3, 1, 4, 2, 3, stats.recentActions]}
          sparkColor="#f59e0b"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Fleet health grid */}
        <div className="lg:col-span-2">
          <Card title="Fleet Health">
            {routersByGroup.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">No routers connected</div>
            ) : (
              <div className="space-y-6">
                {routersByGroup.map(({ label, routers: groupRouters }) => (
                  <div key={label}>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">{label}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {groupRouters.map(router => (
                        <div
                          key={router.id}
                          className={cn(
                            "p-3 rounded-xl border-2 transition-all",
                            router.status === 'online'
                              ? "border-emerald-200 bg-emerald-50"
                              : router.status === 'offline'
                              ? "border-rose-200 bg-rose-50"
                              : "border-amber-200 bg-amber-50"
                          )}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full flex-shrink-0",
                              router.status === 'online' ? "bg-emerald-500" :
                              router.status === 'offline' ? "bg-rose-500" : "bg-amber-500"
                            )} />
                            <p className="text-xs font-semibold text-slate-900 truncate">{router.name}</p>
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono truncate">{router.url}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {/* Quick actions */}
          <Card title="Quick Actions">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onAddNode}
                className="flex flex-col items-center gap-2.5 p-4 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:border-indigo-100 border border-transparent transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                  <Plus size={16} className="text-slate-500 group-hover:text-indigo-600" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-indigo-600">Add Node</span>
              </button>
              <button
                onClick={onScan}
                className="flex flex-col items-center gap-2.5 p-4 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-100 border border-transparent transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                  <ShieldCheck size={16} className="text-slate-500 group-hover:text-emerald-600" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-emerald-600">Audit Scan</span>
              </button>
              <button
                onClick={onSync}
                className="flex flex-col items-center gap-2.5 p-4 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:border-indigo-100 border border-transparent transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                  <RefreshCcw size={16} className="text-slate-500 group-hover:text-indigo-600" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-indigo-600">Sync Fleet</span>
              </button>
              <button
                onClick={onExport}
                className="flex flex-col items-center gap-2.5 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-transparent transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                  <Download size={16} className="text-slate-500" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Export Data</span>
              </button>
            </div>
          </Card>

          {/* Activity feed */}
          <Card title="Recent Activity">
            <div className="space-y-1">
              {logs.slice(0, 6).map(log => (
                <div
                  key={log.id}
                  className={cn(
                    "flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors border-l-2 ml-1",
                    actionBorderColor(log.action)
                  )}
                >
                  <div className={cn("w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0", actionDotColor(log.action))} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {log.username} <span className="font-normal text-slate-500">·</span>{' '}
                      <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px] font-mono text-slate-700">{log.action}</code>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {log.router_name || 'System'} · {new Date(log.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <p className="text-center py-4 text-slate-400 text-xs">No recent activity</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({
  label,
  value,
  icon,
  iconBg,
  sparkValues,
  sparkColor,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  sparkValues?: number[];
  sparkColor?: string;
}) {
  const sparkData = sparkValues?.map(v => ({ v }));

  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", iconBg)}>
          {icon}
        </div>
      </div>
      <h3 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">{value}</h3>
      {sparkData && sparkColor && (
        <div className="h-10 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`grad-${label.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={sparkColor} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={sparkColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={sparkColor}
                strokeWidth={1.5}
                fill={`url(#grad-${label.replace(/\s/g, '')})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors. If Recharts types complain, check that `recharts` is in package.json (it is).

- [ ] **Step 4: Run tests**

```bash
npx vitest run
```

Expected: `Tests 15 passed (15)`.

- [ ] **Step 5: Commit**

```bash
git add src/views/Dashboard.tsx src/App.tsx
git commit -m "feat: dashboard redesign — sparklines, fleet health grid, color-coded activity feed, icon quick actions"
```

---

### Task 5: Fleet View Redesign

**Files:**
- Modify: `src/views/Fleet.tsx`

**Interfaces:**
- Consumes: `Select` from `../components/ui/Select` (replaces raw `<select>`)
- Produces: fleet view gains group filter tabs, colored left-border router cards

- [ ] **Step 1: Add `Select` import and `activeGroupFilter` state to Fleet.tsx**

At the top of `src/views/Fleet.tsx`, after the existing imports, add:
```tsx
import { Select } from '../components/ui/Select';
```

After the existing `useState` declarations (around line 56), add:
```tsx
  const [activeGroupFilter, setActiveGroupFilter] = useState<string>('all');
```

- [ ] **Step 2: Add group filter tab bar to Fleet.tsx**

Find the opening `<motion.div>` in the Fleet JSX return (the outer wrapper). Immediately after the "header bar" section (the `<div>` containing the "Edge Fleet" title, refresh button, and Add Router button), insert the group filter tabs. Look for the closing `</div>` of the header bar followed by the `{showAdd && ...}` block.

Insert this JSX block between the header div and `{showAdd && ...}`:

```tsx
      {/* Group filter tabs */}
      {groups.length > 0 && !showManageGroups && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveGroupFilter('all')}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all",
              activeGroupFilter === 'all'
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
            )}
          >
            All ({routers.length})
          </button>
          {groups.map(g => (
            <button
              key={g.id}
              onClick={() => setActiveGroupFilter(g.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all",
                activeGroupFilter === g.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
              )}
            >
              {g.name} ({routers.filter(r => r.group_id === g.id).length})
            </button>
          ))}
        </div>
      )}
```

- [ ] **Step 3: Apply group filter to the rendered router list**

Find the `{routers.map(router => (` line inside the `!showManageGroups` branch (around line 346 area). Replace the `.map` source:

```tsx
          {routers.map(router => (
```
with:
```tsx
          {routers
            .filter(r => activeGroupFilter === 'all' || r.group_id === activeGroupFilter)
            .map(router => (
```

Make sure the closing `))}` of the map still matches.

- [ ] **Step 4: Add colored left-border to router cards**

Find the Card used for each router card:
```tsx
            <Card key={router.id} className={cn("group transition-all relative", selectedRouter?.id === router.id && "ring-2 ring-zinc-900")}>
```

Replace with:
```tsx
            <Card key={router.id} className={cn(
              "group transition-all relative border-l-4",
              router.status === 'online' ? "border-l-emerald-500" :
              router.status === 'offline' ? "border-l-rose-500" : "border-l-amber-400",
              selectedRouter?.id === router.id && "ring-2 ring-indigo-500"
            )}>
```

- [ ] **Step 5: Replace raw `<select>` elements with `Select` component in the Add Router form**

Find the raw `<select>` in the `{showAdd && ...}` form (it looks like):
```tsx
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
```

Replace with:
```tsx
              <Select
                label="Group"
                value={form.group_id}
                onChange={e => setForm({...form, group_id: e.target.value})}
                options={groups.map(g => ({ value: g.id, label: g.name }))}
                placeholder="No Group"
              />
```

- [ ] **Step 6: Replace raw `<select>` in the Edit Router form with `Select` component**

Find the second raw `<select>` in the `{showEdit && ...}` form (same structure). Replace with:
```tsx
              <Select
                label="Group"
                value={editForm.group_id}
                onChange={e => setEditForm({...editForm, group_id: e.target.value})}
                options={groups.map(g => ({ value: g.id, label: g.name }))}
                placeholder="No Group"
              />
```

- [ ] **Step 7: Update status indicator colors to use rose-500 instead of red-500**

Find the status dot in the router card footer:
```tsx
                    router.status === 'offline' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-zinc-300"
```

Replace with:
```tsx
                    router.status === 'offline' ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]" : "bg-slate-300"
```

Also update the status badge in the router card header (around line 350):
```tsx
                  router.status === 'online' ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-400"
```
Replace with:
```tsx
                  router.status === 'online' ? "bg-emerald-50 text-emerald-700" :
                  router.status === 'offline' ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
```

- [ ] **Step 8: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 9: Run tests**

```bash
npx vitest run
```

Expected: `Tests 15 passed (15)`.

- [ ] **Step 10: Commit**

```bash
git add src/views/Fleet.tsx
git commit -m "feat: fleet view redesign — group filter tabs, colored left-border cards, Select component, rose/amber status colors"
```

---

### Task 6: Router Management Redesign

**Files:**
- Modify: `src/views/RouterManagement.tsx`

**Interfaces:**
- Consumes: no new interfaces
- Produces: tab bar uses indigo underline active indicator; pending-changes banner; terminal copy button; Metrics placeholder tab

- [ ] **Step 1: Add `pendingChanges` state and `Metrics` tab to RouterManagement.tsx**

After the existing state declarations (after `const [error, setError] = useState...`), add:
```tsx
  const [pendingChanges, setPendingChanges] = useState(false);
  const [copied, setCopied] = useState(false);
```

In the `tabs` useMemo array, add a Metrics entry after the `system` entry and before `terminal`:
```tsx
    { id: 'interfaces', label: 'Interfaces', icon: <Network size={16} />, path: ['interfaces'] },
    { id: 'routing', label: 'Routing', icon: <Globe size={16} />, path: ['protocols'] },
    { id: 'firewall', label: 'Firewall', icon: <ShieldCheck size={16} />, path: ['firewall'] },
    { id: 'vpn', label: 'VPN', icon: <Lock size={16} />, path: ['vpn'] },
    { id: 'services', label: 'Services', icon: <Zap size={16} />, path: ['service'] },
    { id: 'system', label: 'System', icon: <Cpu size={16} />, path: ['system'] },
    { id: 'metrics', label: 'Metrics', icon: <Activity size={16} />, path: null },
    { id: 'terminal', label: 'Terminal', icon: <TerminalIcon size={16} />, path: null },
```

Add `BarChart2` to the lucide-react import at the top of the file:
```tsx
import {
  Network,
  Globe,
  ShieldCheck,
  Lock,
  Zap,
  Cpu,
  Terminal as TerminalIcon,
  ChevronRight,
  RefreshCcw,
  Activity,
  AlertCircle,
  Copy,
  Check,
  BarChart2,
} from 'lucide-react';
```

- [ ] **Step 2: Replace the tab bar with indigo underline style**

Find the existing tab bar:
```tsx
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
```

Replace with:
```tsx
      <div className="flex border-b border-slate-200 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 -mb-px transition-all",
              activeTab === tab.id
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
```

- [ ] **Step 3: Add pending-changes banner**

Find the `<div className="grid grid-cols-1 gap-6">` that wraps the terminal/config content. Insert the pending changes banner immediately before it:

```tsx
      {pendingChanges && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 animate-pulse" />
          <p className="text-sm font-medium text-amber-800 flex-1">
            Pending changes — commit and save to apply to the running config
          </p>
          <button
            onClick={() => setPendingChanges(false)}
            className="text-amber-600 hover:text-amber-800 text-xs font-semibold transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
```

To trigger `pendingChanges`, find where the terminal `ConfigTerminal` is rendered (inside the `activeTab === 'terminal'` branch). Wrap it with a context so that the banner activates — for now, add an `onChange` prop pattern or a simple note. Actually, the `ConfigTerminal` component doesn't expose a callback. Add a `setPendingChanges(true)` placeholder button next to the terminal for testing. Place it inside the `activeTab === 'terminal'` branch, after the `ConfigTerminal`:

```tsx
        {activeTab === 'terminal' ? (
          <div className="space-y-3">
            <ConfigTerminal routers={[router]} token={token} />
            <div className="flex justify-end">
              <button
                onClick={() => setPendingChanges(true)}
                className="text-xs text-slate-400 hover:text-amber-600 transition-colors"
              >
                Mark changes pending (test)
              </button>
            </div>
          </div>
```

Close the `div` after `</ConfigTerminal>` and the test button:
```tsx
          </div>
```

- [ ] **Step 4: Add copy-to-clipboard button to the config card header**

Find the config card header bar:
```tsx
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
```

Replace with:
```tsx
            <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-zinc-700" />
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                  Path: {tabs.find(t => t.id === activeTab)?.path?.join(' / ')}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(data, null, 2) || '');
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all text-[10px] font-medium"
                  title="Copy to clipboard"
                >
                  {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <div className="flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500/20" />
                  <div className="w-2 h-2 rounded-full bg-amber-500/20" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500/20" />
                </div>
              </div>
            </div>
```

- [ ] **Step 5: Add Metrics placeholder tab content**

In the tab content section, add a `metrics` case. Find the conditional rendering for tab content. The current code has:

```tsx
        {activeTab === 'terminal' ? (
          <ConfigTerminal routers={[router]} token={token} />
        ) : (
          <Card className="p-0 overflow-hidden bg-zinc-900 ...">
```

Change this to:

```tsx
        {activeTab === 'terminal' ? (
          <div className="space-y-3">
            <ConfigTerminal routers={[router]} token={token} />
            <div className="flex justify-end">
              <button
                onClick={() => setPendingChanges(true)}
                className="text-xs text-slate-400 hover:text-amber-600 transition-colors"
              >
                Mark changes pending (test)
              </button>
            </div>
          </div>
        ) : activeTab === 'metrics' ? (
          <Card>
            <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <BarChart2 size={24} className="text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Live Metrics</h3>
                <p className="text-sm text-slate-400 mt-1 max-w-xs">
                  Real-time CPU, memory, and interface throughput charts arrive in Phase 4 via SSE.
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-0 overflow-hidden bg-zinc-900 border-zinc-800 shadow-2xl">
```

Make sure you keep the full closing structure (the `</Card>` and outer `</div>`) from the original.

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors. If `BarChart2` is not recognized, check that lucide-react version has it — if not, use `Activity` or `TrendingUp` instead.

- [ ] **Step 7: Run tests**

```bash
npx vitest run
```

Expected: `Tests 15 passed (15)`.

- [ ] **Step 8: Commit**

```bash
git add src/views/RouterManagement.tsx
git commit -m "feat: router management redesign — indigo tab underline, pending-changes banner, copy-to-clipboard, Metrics placeholder"
```

---

### Task 7: Login View + App Layout Typography

**Files:**
- Modify: `src/views/LoginView.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: no new interfaces
- Produces: Login page uses indigo accent and slate color vocabulary; App layout uses `bg-slate-50`

- [ ] **Step 1: Rewrite `src/views/LoginView.tsx`**

Replace the entire file contents with:

```tsx
import React, { useState } from 'react';
import { Zap, Network, ShieldCheck, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

interface LoginViewProps {
  onLogin: (username: string, password: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const FEATURE_BULLETS = [
  { icon: <Network size={14} />, text: 'Centralized VyOS fleet management' },
  { icon: <ShieldCheck size={14} />, text: 'Encrypted API key storage' },
  { icon: <Lock size={14} />, text: 'JWT-secured session management' },
];

export function LoginView({ onLogin, loading, error }: LoginViewProps) {
  const [form, setForm] = useState({ username: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLogin(form.username, form.password);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 to-slate-800 flex-col p-12 relative overflow-hidden">
        <div className="flex items-center gap-3 mb-auto">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/50">
            <Zap size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">Vy Edge</span>
        </div>

        <div className="my-auto">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Enterprise Network<br />Intelligence Platform
          </h1>
          <p className="text-slate-400 text-base leading-relaxed mb-8 max-w-sm">
            Manage your VyOS fleet from a single control plane with real-time visibility and audit logging.
          </p>
          <ul className="space-y-3">
            {FEATURE_BULLETS.map((b, i) => (
              <li key={i} className="flex items-center gap-3 text-slate-300 text-sm">
                <div className="w-6 h-6 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
                  {b.icon}
                </div>
                {b.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-slate-600 text-xs">v2.5.0-enterprise · Self-hosted</p>

        {/* Decorative circles */}
        <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-indigo-600/5 border border-indigo-600/10" />
        <div className="absolute -bottom-12 -right-12 w-40 h-40 rounded-full bg-indigo-600/5 border border-indigo-600/10" />
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Zap size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">Vy Edge</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Sign in</h2>
            <p className="text-slate-500 text-sm">Enter your credentials to access the management console</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              placeholder="admin"
              disabled={loading}
            />
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              disabled={loading}
            />

            {error && (
              <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl">
                <p className="text-sm text-rose-700 font-medium">{error}</p>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full py-2.5 mt-2">
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-8">
            VyEdge v2.5.0-enterprise · Self-hosted deployment
          </p>
        </motion.div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update `src/App.tsx` — update outer div to use `bg-slate-50`**

Find in App.tsx:
```tsx
    <div className="min-h-screen bg-[#F8F9FA] flex">
```
and replace with:
```tsx
    <div className="min-h-screen bg-slate-50 flex">
```

Also update the `<main>` element to ensure the overflow container uses slate background:
```tsx
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
```
This line is fine as-is (no bg needed, inherits slate-50 from parent).

Update the content padding area:
```tsx
        <div className="flex-1 overflow-y-auto p-8">
```
This is fine as-is.

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Run tests**

```bash
npx vitest run
```

Expected: `Tests 15 passed (15)`.

- [ ] **Step 5: Commit**

```bash
git add src/views/LoginView.tsx src/App.tsx
git commit -m "feat: login view redesign — two-panel layout, indigo brand, slate typography; App.tsx bg-slate-50"
```
