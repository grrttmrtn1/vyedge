# Phase 4: Real-Time SSE Metrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a server-sent events (SSE) stream that pushes live VyOS router metrics every 15 seconds to connected clients, powering live CPU/uptime badges in Fleet view, Recharts charts in the Router Management Metrics tab, and an alert engine that fires toast notifications when thresholds are breached.

**Architecture:** A `GET /api/stream` endpoint maintains an in-memory client registry and a single 15-second polling interval; each cycle calls the VyOS `/op` API for every router in the DB (via `Promise.allSettled`), emits `{type:"metrics"}` SSE events to all clients, evaluates configurable alert rules against the new metrics, and emits `{type:"alert"}` events for breaches. The frontend `useRouterMetrics(routerId, token)` hook wraps `EventSource` (passing the JWT as a query param since `EventSource` has no header support) and maintains a 30-point rolling history per router.

**Tech Stack:** Node.js `EventSource`-style SSE (no package needed — raw `res.write`), Axios (already installed), Recharts `LineChart` (already installed), `jwt` (already installed for token validation in the stream endpoint)

## Global Constraints

- All backend files in `server/` use `.js` extension imports (e.g. `from '../db.js'`)
- Tests in `tests/` import from vitest explicitly (`import { describe, it, expect, beforeAll } from 'vitest'`)
- `globals: false` in vitest — never use bare `describe`/`it` without importing
- `maxWorkers: 1` — tests run serially; no parallel test files
- No frontend tests (server-side only)
- Tailwind CSS v4 utility classes only in frontend (no `style` props)
- `motion/react` for any new animations (NOT framer-motion)
- `cn()` locally defined in every new frontend file using `clsx`+`twMerge` pattern
- Tests import server as `from '../server'` (resolves to `server/index.ts` via TypeScript)
- Existing 15 tests must continue to pass after every task

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `server/db.ts` | Modify | Add `alerts` table and `alert_rules` seed setting |
| `src/types.ts` | Modify | Add `RouterMetrics`, `AlertRule`, `AlertEvent` types |
| `server/services/metrics.ts` | **Create** | `collectRouterMetrics()` — polls VyOS `/op` for cpu/mem/uptime/interfaces/routes/vpn |
| `server/services/alertEngine.ts` | **Create** | `evaluateAlerts()` — reads alert_rules from settings, writes to alerts table, returns events |
| `server/routes/stream.ts` | **Create** | `GET /api/stream` SSE endpoint, client registry, 15s poll loop |
| `server/index.ts` | Modify | Register `streamRouter` at `/api` |
| `src/hooks/useRouterMetrics.ts` | **Create** | `useRouterMetrics(routerId, token)` hook — `EventSource` with rolling 30-point history |
| `src/views/Fleet.tsx` | Modify | Extract `RouterCardLive` sub-component; replace skeleton loaders with live CPU/uptime |
| `src/views/RouterManagement.tsx` | Modify | Wire Metrics tab with `LineChart` for CPU and memory history |
| `src/views/Dashboard.tsx` | Modify | Pulse animation on online/offline count change |
| `tests/metrics.test.ts` | **Create** | Unit tests for `collectRouterMetrics` (mocked axios) |
| `tests/alertEngine.test.ts` | **Create** | Unit tests for `evaluateAlerts` with in-memory DB |
| `tests/stream.test.ts` | **Create** | SSE endpoint auth tests (401 without token, 401 invalid, 200 with valid) |

---

## Task 1: Alerts table migration and TypeScript types

**Files:**
- Modify: `server/db.ts`
- Modify: `src/types.ts`

**Interfaces:**
- Produces: `RouterMetrics`, `AlertRule`, `AlertEvent` types consumed by Tasks 2, 3, 5

- [ ] **Step 1: Add `alerts` table to `server/db.ts`**

Open `server/db.ts`. Find the large `db.exec(`` ... ``)` block containing all `CREATE TABLE IF NOT EXISTS` statements. Append the `alerts` table at the end of that block, before the closing backtick:

```sql
  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    rule_id TEXT NOT NULL,
    router_id TEXT NOT NULL,
    metric TEXT NOT NULL,
    value REAL NOT NULL,
    threshold REAL NOT NULL,
    fired_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME
  );
```

- [ ] **Step 2: Add `alert_rules` seed setting to `server/db.ts`**

Find the `const seedSettings = [` array. Append one entry:

```typescript
  ['alert_rules', '[]'],
```

- [ ] **Step 3: Add types to `src/types.ts`**

Append to the bottom of `src/types.ts`:

```typescript
export interface RouterMetrics {
  routerId: string;
  collectedAt: number;
  cpu: { loadPercent: number } | null;
  memory: { usedMb: number; totalMb: number; usedPercent: number } | null;
  uptime: { seconds: number; str: string } | null;
  interfaces: Array<{ name: string; rxBytes: number; txBytes: number }> | null;
  routes: { total: number } | null;
  vpnPeers: { active: number } | null;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: 'cpu' | 'memory';
  operator: '>' | '<' | '==';
  threshold: number;
  cooldownMinutes: number;
}

export interface AlertEvent {
  type: 'alert';
  ruleId: string;
  ruleName: string;
  routerId: string;
  metric: string;
  value: number;
  threshold: number;
  firedAt: string;
}
```

- [ ] **Step 4: Verify TypeScript and tests**

```bash
npx tsc --noEmit
npx vitest run
```

Expected: 0 errors, 15 tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/db.ts src/types.ts
git commit -m "feat: add alerts table migration and RouterMetrics/AlertEvent types"
```

---

## Task 2: VyOS metrics collection service

**Files:**
- Create: `server/services/metrics.ts`
- Create: `tests/metrics.test.ts`

**Interfaces:**
- Consumes: nothing (standalone service using axios and https from Node)
- Produces: `collectRouterMetrics(router: {id: string; url: string; api_key: string}): Promise<RouterMetrics>` — imported by Tasks 3 and 4

- [ ] **Step 1: Create `server/services/` directory and write the failing test**

```bash
mkdir -p server/services
```

Create `tests/metrics.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('collectRouterMetrics', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns parsed metrics when VyOS responds successfully', async () => {
    const { collectRouterMetrics } = await import('../server/services/metrics.js');

    mockedAxios.post
      .mockResolvedValueOnce({ data: { success: true, data: { cpu: { idle: 82.0 } } } })   // cpu
      .mockResolvedValueOnce({ data: { success: true, data: { total: 8192000, used: 4096000 } } }) // memory
      .mockResolvedValueOnce({ data: { success: true, data: { uptime: '5 days, 2:34:10' } } })     // uptime
      .mockResolvedValueOnce({ data: { success: true, data: [{ ifname: 'eth0', stats: { rx_bytes: 1000, tx_bytes: 2000 } }] } }) // interfaces
      .mockResolvedValueOnce({ data: { success: true, data: { routes: 42 } } })            // routes
      .mockResolvedValueOnce({ data: { success: true, data: [] } });                        // vpn

    const router = { id: 'r1', url: 'https://192.168.1.1', api_key: 'testkey' };
    const result = await collectRouterMetrics(router);

    expect(result.routerId).toBe('r1');
    expect(result.cpu?.loadPercent).toBe(18); // 100 - 82
    expect(result.memory?.usedPercent).toBe(50);
    expect(result.uptime?.str).toBe('5 days, 2:34:10');
    expect(result.interfaces).toHaveLength(1);
    expect(result.interfaces![0].name).toBe('eth0');
    expect(result.routes?.total).toBe(42);
    expect(result.vpnPeers?.active).toBe(0);
  });

  it('returns null fields when VyOS calls fail', async () => {
    const { collectRouterMetrics } = await import('../server/services/metrics.js');

    mockedAxios.post.mockRejectedValue(new Error('ECONNREFUSED'));

    const router = { id: 'r2', url: 'https://10.0.0.1', api_key: 'key' };
    const result = await collectRouterMetrics(router);

    expect(result.routerId).toBe('r2');
    expect(result.cpu).toBeNull();
    expect(result.memory).toBeNull();
    expect(result.uptime).toBeNull();
    expect(result.interfaces).toBeNull();
    expect(result.routes).toBeNull();
    expect(result.vpnPeers).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npx vitest run tests/metrics.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `server/services/metrics.ts`**

```typescript
import axios from 'axios';
import https from 'https';
import type { RouterMetrics } from '../../src/types.js';

const allowSelfSigned = process.env.ALLOW_SELF_SIGNED === 'true';
const httpsAgent = new https.Agent({ rejectUnauthorized: !allowSelfSigned });

async function vyosOp(url: string, apiKey: string, path: string[]): Promise<any> {
  const formData = new URLSearchParams();
  formData.append('key', apiKey);
  formData.append('data', JSON.stringify({ op: 'show', path }));
  const response = await axios.post(`${url}/op`, formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 10000,
    httpsAgent,
  });
  if (!response.data?.success) throw new Error(response.data?.error || 'VyOS error');
  return response.data.data;
}

function parseCpu(data: any): RouterMetrics['cpu'] {
  try {
    const idle = Number(data?.cpu?.idle ?? data?.idle ?? 100);
    if (isNaN(idle)) return null;
    return { loadPercent: Math.round(100 - idle) };
  } catch { return null; }
}

function parseMem(data: any): RouterMetrics['memory'] {
  try {
    const total = Number(data?.total);
    const used = Number(data?.used);
    if (!total || !used || isNaN(total) || isNaN(used)) return null;
    return {
      usedMb: Math.round(used / 1024),
      totalMb: Math.round(total / 1024),
      usedPercent: Math.round((used / total) * 100),
    };
  } catch { return null; }
}

function parseUptime(data: any): RouterMetrics['uptime'] {
  try {
    const str = String(data?.uptime ?? data ?? '');
    if (!str) return null;
    return { seconds: 0, str };
  } catch { return null; }
}

function parseInterfaces(data: any): RouterMetrics['interfaces'] {
  try {
    if (!Array.isArray(data)) return null;
    return data.map((iface: any) => ({
      name: String(iface.ifname ?? iface.name ?? ''),
      rxBytes: Number(iface.stats?.rx_bytes ?? iface.rx_bytes ?? 0),
      txBytes: Number(iface.stats?.tx_bytes ?? iface.tx_bytes ?? 0),
    }));
  } catch { return null; }
}

function parseRoutes(data: any): RouterMetrics['routes'] {
  try {
    if (data?.routes !== undefined) return { total: Number(data.routes) };
    if (Array.isArray(data)) return { total: data.length };
    return null;
  } catch { return null; }
}

function parseVpn(data: any): RouterMetrics['vpnPeers'] {
  try {
    if (!Array.isArray(data)) return { active: 0 };
    return { active: data.filter((p: any) => p.state === 'established').length };
  } catch { return null; }
}

export async function collectRouterMetrics(
  router: { id: string; url: string; api_key: string }
): Promise<RouterMetrics> {
  const [cpuRes, memRes, uptimeRes, ifaceRes, routeRes, vpnRes] = await Promise.allSettled([
    vyosOp(router.url, router.api_key, ['system', 'cpu']),
    vyosOp(router.url, router.api_key, ['system', 'memory']),
    vyosOp(router.url, router.api_key, ['system', 'uptime']),
    vyosOp(router.url, router.api_key, ['interfaces']),
    vyosOp(router.url, router.api_key, ['ip', 'route', 'summary']),
    vyosOp(router.url, router.api_key, ['vpn', 'ipsec', 'sa']),
  ]);

  return {
    routerId: router.id,
    collectedAt: Date.now(),
    cpu: parseCpu(cpuRes.status === 'fulfilled' ? cpuRes.value : null),
    memory: parseMem(memRes.status === 'fulfilled' ? memRes.value : null),
    uptime: parseUptime(uptimeRes.status === 'fulfilled' ? uptimeRes.value : null),
    interfaces: parseInterfaces(ifaceRes.status === 'fulfilled' ? ifaceRes.value : null),
    routes: parseRoutes(routeRes.status === 'fulfilled' ? routeRes.value : null),
    vpnPeers: parseVpn(vpnRes.status === 'fulfilled' ? vpnRes.value : null),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/metrics.test.ts
```

Expected: both tests PASS (mocked axios returns controlled data or throws).

- [ ] **Step 5: Run full suite to confirm no regressions**

```bash
npx vitest run
```

Expected: all existing 15 tests + 2 new metrics tests pass (17 total).

- [ ] **Step 6: Commit**

```bash
git add server/services/metrics.ts tests/metrics.test.ts
git commit -m "feat: VyOS metrics collection service with Promise.allSettled fan-out"
```

---

## Task 3: Alert engine service

**Files:**
- Create: `server/services/alertEngine.ts`
- Create: `tests/alertEngine.test.ts`

**Interfaces:**
- Consumes: `RouterMetrics` from `../../src/types.js`; `db` from `../db.js`
- Produces: `evaluateAlerts(routerId: string, metrics: RouterMetrics): AlertEvent[]` — imported by Task 4

- [ ] **Step 1: Write the failing test**

Create `tests/alertEngine.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { createApp } from '../server';
import { db } from '../server/db';

describe('evaluateAlerts', () => {
  beforeAll(async () => {
    await createApp(); // ensures DB is initialized
  });

  it('returns empty array when no alert_rules configured', async () => {
    const { evaluateAlerts } = await import('../server/services/alertEngine.js');
    db.prepare("UPDATE settings SET value = '[]' WHERE key = 'alert_rules'").run();

    const metrics = {
      routerId: 'r1', collectedAt: Date.now(),
      cpu: { loadPercent: 90 }, memory: null, uptime: null,
      interfaces: null, routes: null, vpnPeers: null,
    };

    const events = evaluateAlerts('r1', metrics);
    expect(events).toEqual([]);
  });

  it('fires alert when metric breaches threshold', async () => {
    const { evaluateAlerts } = await import('../server/services/alertEngine.js');

    const rule = { id: 'rule-1', name: 'High CPU', metric: 'cpu', operator: '>', threshold: 80, cooldownMinutes: 5 };
    db.prepare("UPDATE settings SET value = ? WHERE key = 'alert_rules'").run(JSON.stringify([rule]));
    // Clear any previous alert for this rule/router
    db.prepare("DELETE FROM alerts WHERE rule_id = ? AND router_id = ?").run('rule-1', 'r1');

    const metrics = {
      routerId: 'r1', collectedAt: Date.now(),
      cpu: { loadPercent: 95 }, memory: null, uptime: null,
      interfaces: null, routes: null, vpnPeers: null,
    };

    const events = evaluateAlerts('r1', metrics);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('alert');
    expect(events[0].ruleId).toBe('rule-1');
    expect(events[0].value).toBe(95);
  });

  it('does not fire duplicate alert when already active', async () => {
    const { evaluateAlerts } = await import('../server/services/alertEngine.js');

    // Rule and existing unfired alert already in DB from prior test
    const metrics = {
      routerId: 'r1', collectedAt: Date.now(),
      cpu: { loadPercent: 95 }, memory: null, uptime: null,
      interfaces: null, routes: null, vpnPeers: null,
    };

    const events = evaluateAlerts('r1', metrics);
    expect(events).toHaveLength(0); // already active, no new event
  });

  it('resolves alert when metric clears', async () => {
    const { evaluateAlerts } = await import('../server/services/alertEngine.js');

    const metrics = {
      routerId: 'r1', collectedAt: Date.now(),
      cpu: { loadPercent: 50 }, memory: null, uptime: null,
      interfaces: null, routes: null, vpnPeers: null,
    };

    const events = evaluateAlerts('r1', metrics);
    expect(events).toHaveLength(0); // resolved, no new event

    const resolved = db.prepare("SELECT resolved_at FROM alerts WHERE rule_id = 'rule-1' AND router_id = 'r1'").get() as any;
    expect(resolved?.resolved_at).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npx vitest run tests/alertEngine.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `server/services/alertEngine.ts`**

```typescript
import crypto from 'crypto';
import { db } from '../db.js';
import type { RouterMetrics, AlertEvent, AlertRule } from '../../src/types.js';

function getMetricValue(metrics: RouterMetrics, metric: string): number | null {
  if (metric === 'cpu') return metrics.cpu?.loadPercent ?? null;
  if (metric === 'memory') return metrics.memory?.usedPercent ?? null;
  return null;
}

function evaluate(value: number, operator: string, threshold: number): boolean {
  if (operator === '>') return value > threshold;
  if (operator === '<') return value < threshold;
  if (operator === '==') return value === threshold;
  return false;
}

export function evaluateAlerts(routerId: string, metrics: RouterMetrics): AlertEvent[] {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'alert_rules'").get() as any;
  if (!row?.value) return [];

  let rules: AlertRule[] = [];
  try { rules = JSON.parse(row.value); } catch { return []; }
  if (!Array.isArray(rules) || rules.length === 0) return [];

  const events: AlertEvent[] = [];
  const now = new Date().toISOString();

  for (const rule of rules) {
    const value = getMetricValue(metrics, rule.metric);
    if (value === null) continue;

    const breached = evaluate(value, rule.operator, rule.threshold);
    const existing = db.prepare(
      "SELECT id FROM alerts WHERE rule_id = ? AND router_id = ? AND resolved_at IS NULL"
    ).get(rule.id, routerId) as any;

    if (breached && !existing) {
      db.prepare(`
        INSERT INTO alerts (id, rule_id, router_id, metric, value, threshold, fired_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), rule.id, routerId, rule.metric, value, rule.threshold, now);

      events.push({
        type: 'alert',
        ruleId: rule.id,
        ruleName: rule.name,
        routerId,
        metric: rule.metric,
        value,
        threshold: rule.threshold,
        firedAt: now,
      });
    } else if (!breached && existing) {
      db.prepare("UPDATE alerts SET resolved_at = ? WHERE id = ?").run(now, existing.id);
    }
  }

  return events;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/alertEngine.test.ts
```

Expected: all 4 alertEngine tests PASS.

- [ ] **Step 5: Run full suite**

```bash
npx vitest run
```

Expected: 15 + 2 + 4 = 21 tests pass.

- [ ] **Step 6: Commit**

```bash
git add server/services/alertEngine.ts tests/alertEngine.test.ts
git commit -m "feat: alert engine — evaluates rules against metrics, fires/resolves DB alerts"
```

---

## Task 4: SSE stream endpoint

**Files:**
- Create: `server/routes/stream.ts`
- Modify: `server/index.ts`
- Create: `tests/stream.test.ts`

**Interfaces:**
- Consumes: `collectRouterMetrics` from `../services/metrics.js`; `evaluateAlerts` from `../services/alertEngine.js`; `db` from `../db.js`
- Produces: `GET /api/stream?token=<jwt>` endpoint, consumed by Task 5

- [ ] **Step 1: Write the failing stream connection tests**

Create `tests/stream.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../server';
import type { Express } from 'express';

describe('SSE /api/stream', () => {
  let app: Express;
  let token: string;

  beforeAll(async () => {
    app = await createApp();
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'admin', password: process.env.ADMIN_PASSWORD || 'admin123' });
    token = res.body.token;
  });

  it('returns 401 when no token provided', async () => {
    const res = await request(app).get('/api/stream');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/stream')
      .query({ token: 'not-a-valid-jwt' });
    expect(res.status).toBe(401);
  });

  it('returns 200 with text/event-stream content-type for valid token', async () => {
    const res = await request(app)
      .get('/api/stream')
      .query({ token })
      .buffer(false)
      .timeout({ response: 1000 })
      .catch((err: any) => err.response || err);

    // supertest may time out on an infinite stream — we just need the headers
    const status = res.status ?? res.statusCode;
    const ct = (res.headers?.['content-type'] ?? res.header?.['content-type'] ?? '');
    expect(status).toBe(200);
    expect(ct).toMatch(/text\/event-stream/);
  });
});
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npx vitest run tests/stream.test.ts
```

Expected: first two tests may pass or FAIL (route not registered yet); 3rd test fails. That's fine — continue.

- [ ] **Step 3: Create `server/routes/stream.ts`**

```typescript
import { Router } from 'express';
import type { Response, Request } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { collectRouterMetrics } from '../services/metrics.js';
import { evaluateAlerts } from '../services/alertEngine.js';

const router = Router();

interface SseClient { res: Response; userId: string; }

// Module-level registry — intentional singleton for the lifetime of the process
const clients = new Map<string, SseClient>();
let pollTimer: ReturnType<typeof setInterval> | null = null;

async function pollMetrics() {
  if (clients.size === 0) return;
  const routers = db.prepare('SELECT id, url, api_key FROM routers').all() as Array<{
    id: string; url: string; api_key: string;
  }>;

  await Promise.allSettled(
    routers.map(async (r) => {
      try {
        const metrics = await collectRouterMetrics(r);
        const metricsMsg = `data: ${JSON.stringify({ type: 'metrics', routerId: r.id, payload: metrics })}\n\n`;
        clients.forEach(({ res }) => res.write(metricsMsg));

        const alerts = evaluateAlerts(r.id, metrics);
        for (const alert of alerts) {
          const alertMsg = `data: ${JSON.stringify(alert)}\n\n`;
          clients.forEach(({ res }) => res.write(alertMsg));
        }
      } catch { /* router unreachable — non-fatal */ }
    })
  );
}

router.get('/stream', (req: Request, res: Response) => {
  const token =
    (req.headers.authorization?.replace('Bearer ', '') ||
    req.query.token) as string | undefined;

  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  let user: any;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET!) as any;
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = crypto.randomUUID();
  clients.set(clientId, { res, userId: user.id });

  res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

  if (!pollTimer) {
    pollTimer = setInterval(pollMetrics, 15000);
  }

  req.on('close', () => {
    clients.delete(clientId);
    if (clients.size === 0 && pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  });
});

export default router;
```

- [ ] **Step 4: Register stream router in `server/index.ts`**

Open `server/index.ts`. Add the import after the last route import:

```typescript
import streamRouter from './routes/stream.js';
```

Inside `createApp()`, after the last `app.use(...)` route registration (currently `app.use('/api/system', systemRouter);`), add:

```typescript
  app.use('/api', streamRouter);
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run tests/stream.test.ts
```

Expected: all 3 stream tests PASS.

- [ ] **Step 6: Run full suite**

```bash
npx vitest run
```

Expected: 15 + 2 + 4 + 3 = 24 tests pass.

- [ ] **Step 7: Commit**

```bash
git add server/routes/stream.ts server/index.ts tests/stream.test.ts
git commit -m "feat: SSE /api/stream endpoint with 15s metric polling and alert emission"
```

---

## Task 5: `useRouterMetrics` hook and Dashboard pulse animation

**Files:**
- Create: `src/hooks/useRouterMetrics.ts`
- Modify: `src/views/Dashboard.tsx`

**Interfaces:**
- Consumes: `RouterMetrics`, `AlertEvent` from `../types`; `GET /api/stream?token=<jwt>` from Task 4
- Produces: `useRouterMetrics(routerId, token)` returning `{ latest, history, alerts }` — consumed by Tasks 6 and 7

- [ ] **Step 1: Create `src/hooks/useRouterMetrics.ts`**

```typescript
import { useState, useEffect, useRef } from 'react';
import type { RouterMetrics, AlertEvent } from '../types';

const MAX_HISTORY = 30;

export function useRouterMetrics(routerId: string, token: string | null) {
  const [latest, setLatest] = useState<RouterMetrics | null>(null);
  const [history, setHistory] = useState<RouterMetrics[]>([]);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!token || !routerId) return;

    const es = new EventSource(`/api/stream?token=${encodeURIComponent(token)}`);
    esRef.current = es;

    es.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type === 'metrics' && msg.routerId === routerId) {
          setLatest(msg.payload as RouterMetrics);
          setHistory(prev => [...prev.slice(-(MAX_HISTORY - 1)), msg.payload as RouterMetrics]);
        } else if (msg.type === 'alert' && msg.routerId === routerId) {
          setAlerts(prev => [msg as AlertEvent, ...prev].slice(0, 50));
        }
      } catch { /* malformed event — ignore */ }
    };

    es.onerror = () => {
      // EventSource auto-reconnects; let it do so
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [routerId, token]);

  return { latest, history, alerts };
}
```

- [ ] **Step 2: Add pulse animation to Dashboard when online count changes**

Open `src/views/Dashboard.tsx`. Find the top of the component function. After the existing state/memo derivations (near `const stats = useMemo(...)`), add:

```typescript
const [onlinePulse, setOnlinePulse] = useState(false);
const prevOnlineRef = useRef(stats.online);

useEffect(() => {
  if (stats.online !== prevOnlineRef.current) {
    setOnlinePulse(true);
    prevOnlineRef.current = stats.online;
    const t = setTimeout(() => setOnlinePulse(false), 1200);
    return () => clearTimeout(t);
  }
}, [stats.online]);
```

Add `useRef` to the React import if it isn't already there. Add `useState` if not already there.

Then find the Online stat card's value display. It will look something like:
```tsx
<p className="text-3xl font-bold text-slate-900">{stats.online}</p>
```
Replace with:
```tsx
<p className={cn('text-3xl font-bold text-slate-900 transition-colors duration-300', onlinePulse && 'text-emerald-500')}>
  {stats.online}
</p>
```

(The `cn` helper is already defined at the top of Dashboard.tsx from Phase 3.)

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Run full suite**

```bash
npx vitest run
```

Expected: 24 tests pass (no change — no new tests in this task).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useRouterMetrics.ts src/views/Dashboard.tsx
git commit -m "feat: useRouterMetrics hook with 30-point history; Dashboard pulse on online count change"
```

---

## Task 6: Fleet live CPU and uptime badges

**Files:**
- Modify: `src/views/Fleet.tsx`

**Interfaces:**
- Consumes: `useRouterMetrics(routerId, token)` from `../hooks/useRouterMetrics`; `token` prop already on Fleet

The Fleet view passes `token` as a prop (already in place from Phase 3). We extract a `RouterCardMetrics` sub-component so the hook can be called legally (hooks can't be inside `.map()`).

- [ ] **Step 1: Add `useRouterMetrics` import to Fleet.tsx**

Open `src/views/Fleet.tsx`. Add to the imports section:

```typescript
import { useRouterMetrics } from '../hooks/useRouterMetrics';
```

- [ ] **Step 2: Add `RouterCardMetrics` sub-component inside Fleet.tsx**

Just before the main `Fleet` component export (above `export function Fleet(`), add:

```typescript
function RouterCardMetrics({ routerId, token }: { routerId: string; token: string }) {
  const { latest } = useRouterMetrics(routerId, token);

  return (
    <div className="mt-6 grid grid-cols-2 gap-4">
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">CPU Load</p>
        {latest?.cpu != null ? (
          <p className="text-sm font-bold text-slate-900">{latest.cpu.loadPercent}%</p>
        ) : (
          <div className="h-4 bg-slate-200 rounded animate-pulse w-12" />
        )}
      </div>
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Uptime</p>
        {latest?.uptime?.str ? (
          <p className="text-sm font-bold text-slate-900">{latest.uptime.str}</p>
        ) : (
          <div className="h-4 bg-slate-200 rounded animate-pulse w-16" />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Replace skeleton loaders in router card with `RouterCardMetrics`**

In the router card JSX, find the existing metrics section that renders two skeleton loader divs:

```tsx
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">CPU Load</p>
                  <div className="h-4 bg-slate-200 rounded animate-pulse w-12" />
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Uptime</p>
                  <div className="h-4 bg-slate-200 rounded animate-pulse w-16" />
                </div>
              </div>
```

Replace with:

```tsx
              <RouterCardMetrics routerId={router.id} token={token} />
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Run full suite**

```bash
npx vitest run
```

Expected: 24 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/views/Fleet.tsx
git commit -m "feat: Fleet router cards show live CPU and uptime from SSE stream"
```

---

## Task 7: Router Management Metrics tab with Recharts charts

**Files:**
- Modify: `src/views/RouterManagement.tsx`

**Interfaces:**
- Consumes: `useRouterMetrics(router.id, token)` from `../hooks/useRouterMetrics`; `router` and `token` are already props of `RouterManagement`

The Metrics tab currently shows a placeholder card (BarChart2 icon + "Live Metrics" text). This task replaces it with real Recharts `LineChart` components fed from the `history` array.

- [ ] **Step 1: Add imports to `src/views/RouterManagement.tsx`**

At the top, add to the Recharts import line. Currently there may be a recharts import from Dashboard (but RouterManagement may not have one yet). Add:

```typescript
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useRouterMetrics } from '../hooks/useRouterMetrics';
```

- [ ] **Step 2: Call `useRouterMetrics` inside the `RouterManagement` component**

Open `src/views/RouterManagement.tsx`. Find the `RouterManagement` component function signature:

```typescript
export function RouterManagement({ router, token, onBack }: { ... }) {
```

Inside the component, after the existing `useState` declarations, add:

```typescript
  const { latest, history, alerts: metricAlerts } = useRouterMetrics(router.id, token);
```

- [ ] **Step 3: Replace the Metrics tab placeholder with charts**

Find the metrics placeholder in the JSX. It currently looks like:

```tsx
        ) : activeTab === 'metrics' ? (
          <Card>
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <BarChart2 size={24} className="text-indigo-400 mb-3" />
              <h3 className="text-lg font-semibold text-slate-900">Live Metrics</h3>
              <p className="text-sm mt-1 text-slate-500">Live metrics will be available in Phase 4.</p>
            </div>
          </Card>
```

Replace the entire `activeTab === 'metrics'` branch content with:

```tsx
        ) : activeTab === 'metrics' ? (
          <div className="space-y-4">
            {!latest ? (
              <Card>
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <BarChart2 size={24} className="text-indigo-400 mb-3 animate-pulse" />
                  <h3 className="text-lg font-semibold text-slate-900">Waiting for metrics...</h3>
                  <p className="text-sm mt-1 text-slate-500">Data arrives every 15 seconds.</p>
                </div>
              </Card>
            ) : (
              <>
                <Card>
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-slate-700">CPU Load %</p>
                    <p className="text-xs text-slate-400">Last {history.length} polls</p>
                  </div>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history.map((m, i) => ({ t: i, v: m.cpu?.loadPercent ?? null }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="t" hide />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                        <Tooltip formatter={(v: number) => [`${v}%`, 'CPU']} />
                        <Line type="monotone" dataKey="v" stroke="#6366f1" dot={false} strokeWidth={2} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card>
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-slate-700">Memory Usage %</p>
                    <p className="text-xs text-slate-400">Last {history.length} polls</p>
                  </div>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history.map((m, i) => ({ t: i, v: m.memory?.usedPercent ?? null }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="t" hide />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                        <Tooltip formatter={(v: number) => [`${v}%`, 'Memory']} />
                        <Line type="monotone" dataKey="v" stroke="#10b981" dot={false} strokeWidth={2} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {history.some(m => m.interfaces && m.interfaces.length > 0) && (
                  <Card>
                    <div className="mb-3">
                      <p className="text-sm font-semibold text-slate-700">Interface Throughput (eth0)</p>
                      <p className="text-xs text-slate-400">RX/TX bytes, last {history.length} polls</p>
                    </div>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={history.map((m, i) => {
                          const eth0 = m.interfaces?.find(iface => iface.name === 'eth0');
                          return { t: i, rx: eth0?.rxBytes ?? null, tx: eth0?.txBytes ?? null };
                        })}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="t" hide />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: number, name: string) => [v.toLocaleString(), name === 'rx' ? 'RX bytes' : 'TX bytes']} />
                          <Line type="monotone" dataKey="rx" stroke="#6366f1" dot={false} strokeWidth={2} name="rx" connectNulls />
                          <Line type="monotone" dataKey="tx" stroke="#f59e0b" dot={false} strokeWidth={2} name="tx" connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}

                {metricAlerts.length > 0 && (
                  <Card>
                    <p className="text-sm font-semibold text-slate-700 mb-3">Recent Alerts</p>
                    <ul className="space-y-2">
                      {metricAlerts.map((a, i) => (
                        <li key={i} className="flex items-center gap-3 text-xs">
                          <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                          <span className="text-slate-700 font-medium">{a.ruleName}</span>
                          <span className="text-slate-500">{a.metric} = {a.value} (threshold {a.operator ?? '>'} {a.threshold})</span>
                          <span className="text-slate-400 ml-auto">{new Date(a.firedAt).toLocaleTimeString()}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </>
            )}
          </div>
```

Note: The `AlertEvent` type doesn't have an `operator` field — remove `{a.operator ?? '>'}` from the alert display. Replace that span with:

```tsx
                          <span className="text-slate-500">{a.metric} = {a.value} (threshold: {a.threshold})</span>
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Run full suite**

```bash
npx vitest run
```

Expected: all 24 tests pass.

- [ ] **Step 6: Verify build**

```bash
npm run build
```

Expected: `dist/` generated with no errors.

- [ ] **Step 7: Commit**

```bash
git add src/views/RouterManagement.tsx
git commit -m "feat: Router Management Metrics tab with live Recharts CPU/memory/interface charts"
```

---

## Self-Review

**Spec coverage check against Phase 4 design spec:**

| Requirement | Task |
|-------------|------|
| `GET /api/stream` SSE endpoint | Task 4 ✅ |
| Client registry in-memory Map | Task 4 ✅ |
| 15s polling cycle | Task 4 ✅ |
| `Promise.allSettled` fan-out | Task 2 ✅ |
| CPU, memory, uptime, interfaces, routes, VPN metrics | Task 2 ✅ |
| `{type: 'metrics', routerId, payload}` events | Task 4 ✅ |
| On disconnect: deregister; stop interval when no clients | Task 4 ✅ |
| `useRouterMetrics(routerId)` hook | Task 5 ✅ |
| 30-point rolling history | Task 5 ✅ |
| Fleet: live CPU badge + uptime string | Task 6 ✅ |
| RouterManagement: Metrics tab LineChart | Task 7 ✅ |
| Dashboard: pulse animation on count change | Task 5 ✅ |
| `alerts` table | Task 1 ✅ |
| Alert rules in settings (key: `alert_rules`) | Task 1 ✅ |
| SSE cycle evaluates rules, writes to alerts table | Tasks 3, 4 ✅ |
| `{type: 'alert', ...}` SSE events | Tasks 3, 4 ✅ |
| Toast on alert event | ❌ Not covered — alert toasts require wiring into App.tsx useToast; deferred to a follow-up (alert events are received by RouterManagement's alert list instead) |
| Notification bell badge increments | ❌ Not covered — Header.tsx notification bell hardcoded to empty; deferred |

The two deferred items (toast on alert + bell badge) require App-level changes that cross task boundaries. Both are non-trivial wiring changes. They are marked as out-of-scope for Phase 4 and should be addressed in a small follow-up or Phase 5.
