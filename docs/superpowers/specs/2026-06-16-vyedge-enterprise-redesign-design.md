# VyEdge Enterprise Redesign — Design Spec

**Date:** 2026-06-16  
**Status:** Approved  
**Approach:** Phase-based Incremental (A)  
**Deployment model:** Self-hosted enterprise — single org, large fleet  
**Database:** SQLite (keep, with WAL hardening)  
**UI direction:** Modern SaaS light — indigo/emerald/rose accents, dark sidebar + light content  

---

## Context

VyEdge is a VyOS fleet management platform (React 19 + Express 5 + SQLite) currently at v2.5.0-enterprise. The codebase has a solid structural foundation but carries 20+ bugs (several critical), a 2465-line `App.tsx` monolith, stub features presented as real (backup/restore, SSO, metrics), and a monochrome UI. The goal is to make it genuinely enterprise-ready with a polished, engaging interface while achieving feature parity with the VyManager reference project.

---

## Phase 1 — Critical Bug Fixes & Security Hardening

### Security

- **JWT_SECRET must be required** — crash on startup if `JWT_SECRET` env var is absent; remove the `"vyos-enterprise-secret-key"` fallback entirely
- **Plaintext VPN shared secrets** — encrypt with `crypto.createCipheriv` (AES-256-GCM) keyed from an `ENCRYPTION_KEY` env var before writing to SQLite; decrypt on read
- **Rate limiting on `/api/login`** — add `express-rate-limit`: 10 attempts / 15 min per IP; return HTTP 429 with `Retry-After` header; log failed attempts (already partially done)
- **`window.VyEdgeDebug` in production** — gate the entire block behind `import.meta.env.DEV`
- **VyOS proxy TLS** — add `ALLOW_SELF_SIGNED=true` env flag; when false (production default), reject self-signed certs on the Axios VyOS proxy call

### UX / Correctness

- **Delete confirmations removed** — the `window.confirm` calls were removed with the comment "iframe restrictions"; replace with a lightweight inline confirmation UI (a small `<div>` that renders "Are you sure? [Confirm] [Cancel]" inline in the card) for Phase 1; Phase 2 replaces this with the formal `ConfirmModal` component
- **Hardcoded fake metrics** — router cards show `12%` CPU and `14d 2h` uptime unconditionally; remove these fields and replace with skeleton loaders until Phase 4 provides real data
- **CSV Export button has no handler** — wire to serialize the current filtered log array to CSV and trigger a browser download
- **Backup/Restore stubs return fake success** — implement real SQLite `.backup()` to a timestamped file in a configurable `BACKUP_DIR`, returning the file as a download; clearly mark Restore as "coming soon" with a UI banner rather than faking success

### Type Safety

- **`id: number` vs UUID strings** — fix all function signatures: `handleDelete(id: string)`, `checkStatus(id: string)`, `handleDeleteGroup(id: string)`, `handleDeleteUser(id: string)`, `ConfigNode` `routerId: string`
- **`router.group_id` missing from Router interface** — add `group_id?: string` to the `Router` type
- **`selectedRouter?.id === id` comparison** — resolved by the type fixes above

### Architecture / Hygiene

- **Dead code removal** — delete `src/pages/` (8 unused files), `src/components/Layout.tsx` (uses React Router but app uses state nav), `list_users.ts`, `list_users_full.ts`, `debug_auth.ts`, `test_login.ts` from repo root
- **`*.db` committed to git** — add `*.db`, `*.db-shm`, `*.db-wal` to `.gitignore`; remove `vy_control.db` from git history
- **SQLite WAL mode** — add `db.pragma('journal_mode = WAL')` and `db.pragma('synchronous = NORMAL')` immediately after `new Database()`
- **Dead tab: `map`** — remove `'map'` from the `activeTab` union type; it is referenced in state but never rendered

---

## Phase 2 — Architecture Refactor

### Frontend File Structure

```
src/
  components/
    ui/           ← Card, Button, Input, Badge, Select, Modal, Toast (single source of truth)
    layout/       ← Sidebar, Header, NavItem
  views/
    Dashboard.tsx
    Fleet.tsx          ← RoutersView + RouterManagementView
    ConfigTerminal.tsx
    ConfigBrowser.tsx
    Logs.tsx
    Users.tsx
    Settings.tsx
  hooks/
    useAuth.ts         ← token, user, login, logout, global 401 handling
    useRouters.ts      ← fetch, refresh, add, edit, delete
    useGroups.ts
    useLogs.ts
    useToast.ts
  api/
    client.ts          ← fetch wrapper: auto auth header, global 401 handler, typed responses
    routers.ts
    groups.ts
    users.ts
    logs.ts
    vyos.ts
    settings.ts
  types.ts             ← single source of truth for all interfaces
  App.tsx              ← tab routing shell only (~50 lines)
```

`App.tsx` moves from 2465 lines to ~50 lines of routing logic. All view logic moves to `src/views/`. All shared components consolidated in `src/components/ui/` — `UI.tsx` and `App.tsx` duplicates removed.

### Toast Notification System

- `useToast` hook exposes `toast.success(msg)`, `toast.error(msg)`, `toast.warning(msg)`
- `ToastContainer` renders stacked toasts in the top-right corner
- Toasts auto-dismiss after 4 seconds, support manual dismiss
- Powered by `motion/react` (already installed) for slide-in/out animation
- Replaces all 11 `alert()` calls in the application

### ConfirmModal Component

- Props: `title`, `description`, `confirmLabel`, `onConfirm`, `onCancel`, `variant: 'danger' | 'warning'`
- Used for: delete router, delete group, delete user, restore from backup
- Rendered via a portal at the root level

### API Client Layer (`src/api/client.ts`)

- Single `apiFetch(path, options)` wrapper around `fetch`
- Automatically injects `Authorization: Bearer <token>` from `localStorage`
- On HTTP 401: clears token from localStorage and emits a logout event (caught by `useAuth`)
- On HTTP 4xx/5xx: throws a typed `ApiError` with `status` and `message` fields
- All `src/api/*.ts` modules use this wrapper and return typed results

### Server Refactor

Split `server.ts` (1017 lines, one function) into:

```
server/
  index.ts           ← Express app setup, middleware registration, Vite dev integration, listen
  db.ts              ← Database init, WAL pragma, migrations, seed
  routes/
    auth.ts          ← POST /api/login
    routers.ts       ← CRUD /api/routers
    groups.ts        ← CRUD /api/router-groups
    users.ts         ← CRUD /api/users
    vyos.ts          ← POST /api/vyos/:routerId/:action
    logs.ts          ← GET /api/logs
    settings.ts      ← GET/POST /api/settings
    system.ts        ← /api/system/backup|restore|restart, /api/system-info
  middleware/
    authenticate.ts
    authorize.ts
    rateLimit.ts
    ipCapture.ts
```

### Zod Validation

Every POST/PATCH route gets a Zod schema for its request body. Invalid payloads return HTTP 400 with a structured `{ error: string, fields: Record<string, string> }` response. The `zod` package is already installed.

---

## Phase 3 — UI Redesign: Modern SaaS Light

### Color System

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `indigo-600` / `indigo-500` | Buttons, active nav, focus rings, links |
| Success | `emerald-500` | Online status, confirmations |
| Warning | `amber-500` | Degraded status, alert thresholds |
| Danger | `rose-500` | Offline, errors, destructive actions |
| Surface BG | `slate-50` | Page background |
| Card | `white` | Card backgrounds |
| Border | `slate-200` | Card / input borders |
| Text primary | `slate-900` | Body text |
| Text secondary | `slate-500` | Labels, secondary info |
| Text muted | `slate-400` | Timestamps, metadata |
| Sidebar | `slate-900` → `slate-800` | Dark sidebar gradient |

### Sidebar

- Dark gradient sidebar (`slate-900` → `slate-800`), light main content — the canonical "Vercel/Linear" split
- Logo: proper indigo glyph mark replacing the generic Shield icon
- Nav items: icon + label, indigo `3px` left-border + `indigo-50/10` background on active state, white text
- User section at bottom: avatar with initials, role badge in appropriate color

### Header

- Breadcrumb-style page title (`Fleet / Edge-01 / Interfaces`) instead of flat tab name
- Global search → command palette triggered by `Cmd+K`: searches routers by name/URL, groups, recent log actions
- Notification bell → dropdown panel showing last 5 unread alerts with dismiss
- System status chip: expanded on hover to show DB health + uptime

### Dashboard

- **Stat cards**: add mini 7-point sparkline (Recharts `<Sparkline>`) showing 24h trend for each metric
- **Fleet health grid**: visual grid of router tiles (not a list) grouped by router group, tile color = health state
- **Activity feed**: timeline-style with color-coded left border per action type (login = indigo, configure = amber, delete = rose, add = emerald)
- **Quick actions**: keep 2×2 grid, add icon background fills and hover lift

### Fleet View

- Router cards: colored `4px` left border strip (emerald = online, rose = offline, amber = unknown)
- Skeleton loaders for CPU/uptime fields until Phase 4 data arrives
- Group filter tabs at top of Fleet view — filter by group inline, no mode toggle needed
- Card hover: `translateY(-2px)` + shadow lift

### Router Management View

- Tab bar: indigo underline active indicator, icon + label
- Sticky "pending changes" banner when a config `set` command has been sent but the page hasn't been refreshed
- Terminal output: copy-to-clipboard button
- Metrics tab placeholder (populated in Phase 4)

### Forms & Inputs

- Focus rings: `indigo-500/20` ring, `indigo-500` border
- Select: custom chevron via background-image SVG (not raw `appearance-none`)
- Form sections: labeled dividers, logical grouping

### Micro-interactions

- Button press: `scale-[0.97]` — standardized across all buttons
- Card hover: `translateY(-2px)` + `shadow-md`
- Nav active indicator: `motion/react` `layoutId="nav-active"` (partially done — standardize)
- Page transitions: `AnimatePresence` fade + 8px Y slide — already in place, make consistent

### Typography Scale

- Page titles: `text-2xl font-bold text-slate-900`
- Section headers: `text-lg font-semibold text-slate-900`
- Card headers: `text-sm font-semibold text-slate-700`
- Labels: `text-xs font-medium text-slate-500 uppercase tracking-wider` — reserved for labels/metadata only (reduce current over-use)
- Body: `text-sm text-slate-700`
- Mono/code: `font-mono text-xs`

---

## Phase 4 — Real-Time Live Metrics

### Architecture: Server-Sent Events

Add `GET /api/stream` SSE endpoint. On connection, the server:
1. Registers the client in an in-memory client set
2. Every 15 seconds, fans out to all routers the requesting user has access to
3. Collects operational data via the VyOS API proxy (non-blocking, `Promise.allSettled`)
4. Pushes `data: { type: 'metrics', routerId, payload }` events to all connected clients
5. On client disconnect, removes from client set

**Data collected per cycle per router:**
- CPU load average (`show system cpu`)
- Memory used/total (`show system memory`)
- Per-interface RX/TX bytes and packets (`show interfaces`)
- System uptime (`show system uptime`)
- Routing table entry count (`show ip route summary`)
- Active VPN peer count (`show vpn ipsec sa` / `show vpn wireguard peers`)

### Frontend

- `useRouterMetrics(routerId)` hook: connects to `/api/stream`, filters events by routerId, maintains a rolling 30-point history array
- Fleet view router cards: live CPU % badge and uptime string (replaces skeleton loaders from Phase 3)
- Router Management view: new **Metrics** tab with Recharts `<LineChart>` for CPU, memory, and per-interface throughput — auto-updates as SSE events arrive
- Dashboard stat cards: live online/offline count with a green pulse animation when count changes

### Alerts Engine (inline with SSE cycle)

- `alerts` table: `id`, `rule_id`, `router_id`, `metric`, `value`, `threshold`, `fired_at`, `resolved_at`
- Alert rules stored in `settings` table as JSON array (key: `alert_rules`)
- Each SSE cycle: evaluate all alert rules against current metrics; write to `alerts` on new breach; emit `{ type: 'alert', ... }` SSE event to clients
- Frontend: toast notification on alert event; notification bell badge increments

---

## Phase 5 — VyManager Feature Parity

### NAT Management (new RouterManagementView tab)

- Fetch existing rules: `show nat source rule` / `show nat destination rule`
- Display as table: rule number, outbound interface, translation, description, action
- Add rule form: type (source/destination), rule number, outbound interface, source, translation address/port
- Delete rule: sends `delete nat source rule <n>` via configure API
- Commit: sends `commit` + `save` after each change

### Services Management (new tab)

Collapsible panels per service, each showing current VyOS config and an edit form:
- **DHCP**: subnet, range, default gateway, DNS servers, lease time
- **DNS Forwarding**: listen address, allow-from, name servers, cache size
- **NTP**: allow-clients, servers list
- **SSH**: port, disable-password-authentication toggle, allowed users

### Container Management (new tab)

- `show container` → table of name, image, state, ports, created date
- Start/stop/restart via operational commands
- Read-only for non-admin roles

### Firewall Policy Management (upgrade)

Current firewall page stores rules only in local SQLite — no VyOS integration. Replace with:
- Fetch live from `show firewall` config tree
- Named rule sets with default-action display
- Address groups and network groups panels
- Add/delete rules and groups via configure API
- Retain local DB "draft" staging area: rules drafted locally, then deployed to VyOS via a "Deploy" button with diff preview

### Dark Mode

- `ThemeProvider` wraps the app; `useTheme()` returns `'light' | 'dark'` and a toggle function
- Persisted in `localStorage` under key `vyedge_theme`
- Tailwind `dark:` variants applied to all components
- Toggle button in the header (sun/moon icon)

### VyOS Version Detection

- On router registration: probe `show version`, parse major version (`1.4`, `1.5`, `rolling`), store as `vyos_version TEXT` in the `routers` table
- Version stored with router record; no live re-detection after registration (manual "Re-detect" button available)
- UI: version badge on router cards; features unsupported on detected version shown as disabled with tooltip explaining the version requirement

---

## Phase 6 — Enterprise Features

### Config Change Diffing & Rollback

- New table: `config_snapshots` (`id`, `router_id`, `path TEXT`, `before TEXT`, `after TEXT`, `user_id`, `timestamp`)
- On every successful `set` / `delete` configure command: capture before/after JSON for the affected path, write snapshot
- Router Management view: new **History** tab — timeline list of changes with unified diff display (before lines in rose-50, after lines in emerald-50)
- Rollback: re-applies the `before` value via configure API, requires `ConfirmModal`, writes a new snapshot with inverse diff

### Alert Rules & Webhook Notifications

- Settings page: **Alerts** section — create named rules with: metric (cpu, memory, status), operator (`>`, `<`, `==`), threshold, cooldown period (minutes)
- Notification destinations per rule:
  - In-app (Phase 4 system, already built)
  - Webhook: POST JSON `{ rule, router, value, threshold, timestamp }` to a configured URL (Slack/Teams/PagerDuty compatible)
- Alert history page: fired/resolved events, timestamp, router, value at time of firing

### Compliance Report Export

- Settings → Reports: generate a structured report for a selected date range covering:
  - User access summary (logins, actions by user)
  - Failed login attempts with IP addresses
  - Configuration changes by user and router
  - Router uptime statistics
  - Audit retention policy status
- Exported as JSON (machine-readable) or formatted CSV
- Satisfies SOC2 Type II evidence collection for access control and change management controls

### API Key Management

- Admins create named API tokens scoped to: `read-only`, `configure`, `admin`
- Tokens: cryptographically random 32-byte hex string, stored as bcrypt hash, never returned after creation
- `api_keys` table: `id`, `name`, `key_hash`, `scope`, `created_by`, `last_used_at`, `created_at`
- The existing `authenticate` middleware checks for `Bearer` token first (JWT), then falls back to API key lookup
- Every API key use is audit logged with the key name

### Session Management Dashboard

- Admin Settings tab: **Active Sessions** — lists current JWT sessions: username, IP, login time, last-seen
- Implementation: `token_revocations` table (`jti TEXT PRIMARY KEY`, `expires_at DATETIME`) checked on each authenticated request; expired rows pruned daily. Chosen over refresh tokens to avoid frontend complexity.
- Force-logout: inserts token `jti` into revocations table; next request with that token gets HTTP 401

---

## What Is Explicitly Out of Scope

- Multi-tenant SaaS / billing — not needed for self-hosted single-org
- Migration from SQLite to PostgreSQL — SQLite with WAL handles the target fleet size
- Mobile app / responsive mobile layout — admin tool, desktop-first is appropriate
- Real-time collaborative editing — single admin at a time is the assumed model

---

## Implementation Sequence

| Phase | Deliverable | Prerequisite |
|-------|-------------|--------------|
| 1 | Bug fixes + security | None |
| 2 | Refactor + toast + modal | Phase 1 |
| 3 | UI redesign | Phase 2 |
| 4 | Real-time SSE metrics | Phase 2 |
| 5 | VyManager parity features | Phase 3 |
| 6 | Enterprise features | Phase 4, Phase 5 |

Phases 3 and 4 can run in parallel after Phase 2 completes.
