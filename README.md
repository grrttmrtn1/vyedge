# VyEdge

A self-hosted fleet management platform for VyOS routers. Manage multiple routers from a single dashboard — live metrics, NAT rules, firewall policies, services configuration, container management, and a full config browser with interactive terminal.

## Features

- **Fleet overview** — register and monitor multiple VyOS routers; live CPU, memory, and uptime streamed via SSE; online/offline status badges; VyOS version detection
- **Dark mode** — full light/dark theme with toggle, persisted to localStorage
- **NAT management** — view, add, and delete source and destination NAT rules with commit+save
- **Services management** — configure DHCP server, DNS forwarding, NTP, and SSH from collapsible panels
- **Container management** — list containers with status badges, start/stop/restart via op-mode
- **Firewall policy** — browse live rule sets, stage changes as drafts, preview diff, and deploy atomically
- **Config browser** — tree-navigation of the full VyOS configuration
- **Interactive terminal** — run VyOS op-mode commands directly from the browser
- **Metrics & alerts** — live CPU/memory charts (30-point history), configurable alert rules, SSE-streamed to all clients
- **Audit log** — every configuration action logged with user, router, IP, and timestamp
- **Multi-tenant, role-based access** — admin / operator / viewer roles, router groups for access scoping
- **Command palette** — `⌘K` / `Ctrl+K` global search and navigation

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS v4, Recharts, motion/react |
| Backend | Express 5, TypeScript, tsx |
| Database | SQLite via better-sqlite3 (WAL mode) |
| Auth | JWT (HS256), bcrypt password hashing, AES-256-GCM API key encryption |
| Build | Vite 7 |
| Tests | Vitest + supertest |

## Getting Started

### Prerequisites

- Node.js 20+
- A VyOS router with the HTTP API enabled

### Install

```bash
npm install
```

### Configure

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | Yes | Long random string for signing JWTs — `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | Yes | Exactly 64 hex characters for AES-256-GCM — `openssl rand -hex 32` |
| `ADMIN_PASSWORD` | No | Initial admin password (default: `admin123`) — change immediately |
| `DB_PATH` | No | Path to the SQLite database file (default: `vyos_manager.db`) |
| `ALLOW_SELF_SIGNED` | No | Set `true` to skip TLS verification for lab routers with self-signed certs — **never in production** |
| `BACKUP_DIR` | No | Directory for temporary config backup files (default: `./backups`) |

### Run (development)

```bash
npm run dev
```

Opens at `http://localhost:3000`. Vite middleware serves the frontend with HMR; Express handles all `/api` routes.

### Run (production)

```bash
npm run build
NODE_ENV=production node server.ts
```

### VyOS router setup

Enable the HTTP API on each router you want to manage:

```
set service https api keys id vyedge key '<your-api-key>'
commit
save
```

Then register the router in VyEdge under Fleet → Add Router, using the router's HTTPS URL and the API key above.

## Development

```bash
npm test              # run test suite once
npm run test:watch    # watch mode
npm run test:coverage # coverage report
npm run lint          # ESLint
```

Tests use `vitest` with `environment: 'node'` and `supertest` against the Express app.

## Project Structure

```
server/
  db.ts                  # SQLite schema, migrations, seed admin user
  index.ts               # Express app factory + Vite dev middleware
  middleware/            # authenticate, authorize, rateLimit, ipCapture
  routes/                # auth, routers, groups, users, vyos, firewall,
                         # logs, settings, system, stream, data
  services/
    metrics.ts           # VyOS metric collection (CPU, memory, uptime)
    alertEngine.ts       # evaluates alert rules, fires/resolves DB alerts

src/
  api/                   # typed fetch helpers per domain
  components/
    layout/              # Header (theme toggle, command palette), Sidebar, NavItem
    ui/                  # Button, Card, Input, Select, Toast, ConfirmModal
  context/
    ThemeContext.tsx      # light/dark theme provider
  hooks/                 # useAuth, useRouters, useGroups, useRouterMetrics, ...
  views/
    Dashboard.tsx         # alert summary, online count, recent logs
    Fleet.tsx             # router card grid with live SSE metrics
    RouterManagement.tsx  # per-router tab shell
    NatTab.tsx            # NAT rules management
    ServicesTab.tsx       # DHCP / DNS / NTP / SSH configuration
    ContainersTab.tsx     # container list and actions
    FirewallTab.tsx       # firewall rule sets and draft-based deploy
    RouterMetricsTab.tsx  # CPU / memory time-series charts
    ConfigBrowser.tsx     # tree navigation of VyOS config
    ConfigTerminal.tsx    # interactive op-mode terminal
    Logs.tsx / Users.tsx / Settings.tsx
  types.ts               # shared TypeScript interfaces

tests/                   # vitest test files
```

## API Overview

All routes under `/api` require a `nexus_token` cookie (JWT) except `POST /api/login`.

| Method | Path | Description |
|---|---|---|
| POST | `/api/login` | Authenticate, receive JWT cookie |
| GET | `/api/routers` | List routers visible to the current user |
| POST | `/api/routers` | Register a new router |
| POST | `/api/routers/:id/detect-version` | Probe and store VyOS version |
| POST | `/api/vyos/:id/configure` | Send configure commands to a router |
| GET | `/api/stream` | SSE stream of live metrics and alerts |
| GET | `/api/firewall/:routerId/drafts` | List staged firewall changes |
| POST | `/api/firewall/:routerId/drafts` | Stage a firewall change |
| DELETE | `/api/firewall/:routerId/drafts/:id` | Remove a staged change |
| POST | `/api/firewall/:routerId/deploy` | Apply staged changes to VyOS |
| GET | `/api/logs` | Audit log |
| GET | `/api/users` | User management (admin only) |

## Roles

| Role | Access |
|---|---|
| `admin` | Full access — users, groups, all routers, settings |
| `operator` | Configure routers in assigned groups |
| `viewer` | Read-only access to assigned routers |

Router groups scope which routers each user can see. Admins bypass group checks.

## License

MIT
