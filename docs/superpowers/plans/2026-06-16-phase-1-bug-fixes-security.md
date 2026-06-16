# Phase 1: Bug Fixes & Security Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all critical security vulnerabilities, correctness bugs, type errors, and dead code identified in the Phase 1 design spec, leaving the app secure and honest about its capabilities.

**Architecture:** All security fixes target `server.ts` directly (Phase 2 splits it into modules). UI fixes target `src/App.tsx`. A minimal `createApp()` factory is extracted from `server.ts` to enable backend integration tests with Supertest without starting the Vite dev server.

**Tech Stack:** Vitest (test runner), Supertest (HTTP integration tests), express-rate-limit (rate limiting), Node.js `crypto` (AES-256-GCM VPN secret encryption), better-sqlite3 `.backup()` (real backup), Tailwind CSS (skeleton loaders)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | Modify | Add vitest, supertest, express-rate-limit dependencies |
| `vitest.config.ts` | Create | Vitest config pointing at server-side tests |
| `tests/setup.ts` | Create | Test env vars (JWT_SECRET, ENCRYPTION_KEY, DB_PATH) |
| `tests/auth.test.ts` | Create | Login rate limiting + JWT secret enforcement tests |
| `tests/vpn.test.ts` | Create | VPN secret encryption/decryption tests |
| `tests/backup.test.ts` | Create | Real backup endpoint test |
| `server.ts` | Modify | Extract `createApp()`, add security fixes, WAL mode |
| `src/App.tsx` | Modify | Type fixes, fake metrics removal, CSV export, debug gate, map tab |
| `src/components/InlineConfirm.tsx` | Create | Inline confirm UI for delete actions |
| `.env.example` | Modify | Add JWT_SECRET, ENCRYPTION_KEY, ALLOW_SELF_SIGNED, BACKUP_DIR |
| `.gitignore` | Modify | Add `*.db`, `*.db-shm`, `*.db-wal` |

**Files to delete (dead code):**
- `src/pages/Dashboard.tsx`, `src/pages/VPN.tsx`, `src/pages/Login.tsx`, `src/pages/Configuration.tsx`, `src/pages/Logs.tsx`, `src/pages/Routes.tsx`, `src/pages/Users.tsx`, `src/pages/Firewall.tsx`
- `src/components/Layout.tsx`
- `list_users.ts`, `list_users_full.ts`, `debug_auth.ts`, `test_login.ts`
- `vy_control.db` (from git history)

---

## Task 1: Install dependencies and create Vitest config

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`

- [ ] **Step 1: Install test and security packages**

```bash
npm install --save-dev vitest @vitest/coverage-v8 supertest @types/supertest
npm install express-rate-limit
```

Expected: packages appear in `package.json` dependencies/devDependencies.

- [ ] **Step 2: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 10000,
  },
});
```

- [ ] **Step 4: Create `tests/setup.ts`**

```typescript
import { beforeAll } from 'vitest';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough';
  process.env.ENCRYPTION_KEY = 'a'.repeat(64); // 64 hex chars = 32 bytes
  process.env.DB_PATH = ':memory:';
  process.env.NODE_ENV = 'test';
  process.env.BACKUP_DIR = '/tmp/vyedge-test-backups';
});
```

- [ ] **Step 5: Run tests to verify setup works**

```bash
npm test
```

Expected: "No test files found" (no tests yet) — exits 0. If it exits non-zero, fix the config.

- [ ] **Step 6: Commit**

```bash
git add package.json vitest.config.ts tests/setup.ts
git commit -m "test: add Vitest + Supertest test infrastructure"
```

---

## Task 2: Extract `createApp()` from server.ts for testability

**Files:**
- Modify: `server.ts`

The existing `startServer()` function creates the Express app, sets up all routes, starts Vite (dev mode), and calls `app.listen()`. Tests need the Express app without Vite or listen. This task extracts a `createApp()` function that does everything except Vite and listen.

- [ ] **Step 1: Refactor server.ts to extract createApp()**

In `server.ts`, restructure the bottom portion. Find the current `startServer()` function and split it. The `createApp()` function contains everything from `const app = express()` through all route definitions. The `startServer()` function calls `createApp()`, then adds Vite middleware, then listens.

Replace the current `async function startServer() {` block with:

```typescript
export async function createApp(): Promise<import('express').Express> {
  const app = express();
  app.use(express.json());

  // IP Capture Middleware
  app.use((req: any, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    req.clientIp = typeof ip === 'string' ? ip.split(',')[0].trim() : ip;
    next();
  });

  // Move every line from the existing startServer() body here:
  //   - validatePassword function
  //   - authenticate middleware
  //   - authorize middleware
  //   - ALL app.get / app.post / app.patch / app.delete / app.all route definitions
  // Stop before the Vite block ("if (process.env.NODE_ENV !== 'production')") and before app.listen()

  return app;
}

async function startServer() {
  let app: import('express').Express;
  try {
    app = await createApp();
  } catch (err: any) {
    console.error(err.message);
    process.exit(1);
  }

  // Keep existing Vite block here — express is already statically imported at top of file
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => res.sendFile(path.resolve("dist/index.html")));
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
```

**What moves where:** Cut every line from inside the existing `startServer()` body — from `const app = express();` through the last `app.post(...)` or `app.all(...)` route — and paste it as the body of `createApp()`, before `return app`. The `createViteServer` import at the top of the file stays. The `app.listen()` call and the Vite `if/else` block stay in `startServer()`.

- [ ] **Step 2: Verify the server still starts**

```bash
npm run dev
```

Expected: "Server running on http://0.0.0.0:3000" — same behavior as before.

- [ ] **Step 3: Commit**

```bash
git add server.ts
git commit -m "refactor: extract createApp() factory for testability"
```

---

## Task 3: Require JWT_SECRET — crash on startup if missing

**Files:**
- Modify: `server.ts`
- Create: `tests/auth.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/auth.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../server';
import type { Express } from 'express';

describe('Auth', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createApp();
  });

  it('returns 401 for wrong credentials', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'admin', password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('returns 200 with token for correct credentials', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'admin', password: process.env.ADMIN_PASSWORD || 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe('admin');
  });
});
```

- [ ] **Step 2: Run to verify the test fails (server not yet importable)**

```bash
npm test
```

Expected: test file runs but may fail if `createApp` import path doesn't resolve yet.

- [ ] **Step 3: Add startup env validation to server.ts**

At the very top of `createApp()`, before any other code, add:

```typescript
export async function createApp(): Promise<import('express').Express> {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      'FATAL: JWT_SECRET environment variable is required. Set it to a long random string (e.g., openssl rand -hex 32).'
    );
  }

  // existing code continues...
  const app = express();
```

And update `startServer()` to handle the error gracefully:

```typescript
async function startServer() {
  let app;
  try {
    app = await createApp();
  } catch (err: any) {
    console.error(err.message);
    process.exit(1);
  }
  // ... rest of startServer
}
```

Also remove the fallback from the existing `JWT_SECRET` line:

```typescript
// Change this:
const JWT_SECRET = process.env.JWT_SECRET || "vyos-enterprise-secret-key";

// To this (the validation above will throw before this runs if it's missing):
const JWT_SECRET = process.env.JWT_SECRET!;
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: both auth tests PASS (the `tests/setup.ts` sets `JWT_SECRET`).

- [ ] **Step 5: Commit**

```bash
git add server.ts tests/auth.test.ts
git commit -m "security: require JWT_SECRET env var, crash on missing"
```

---

## Task 4: Rate limit /api/login (10 attempts / 15 min per IP)

**Files:**
- Modify: `server.ts`
- Modify: `tests/auth.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `tests/auth.test.ts`, inside the `describe('Auth')` block:

```typescript
  it('returns 429 after 10 failed login attempts', async () => {
    const failedLogin = () =>
      request(app)
        .post('/api/login')
        .send({ username: 'admin', password: 'wrong' });

    // Make 10 failed attempts
    for (let i = 0; i < 10; i++) {
      await failedLogin();
    }

    // 11th attempt should be rate limited
    const res = await failedLogin();
    expect(res.status).toBe(429);
  });
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test tests/auth.test.ts
```

Expected: FAIL — the 11th request still returns 401, not 429.

- [ ] **Step 3: Add rate limiting middleware to server.ts**

At the top of `server.ts`, add the import:

```typescript
import rateLimit from 'express-rate-limit';
```

Inside `createApp()`, before the `app.post("/api/login", ...)` route, add:

```typescript
  const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: any) => req.clientIp || req.ip,
  });

  app.post("/api/login", loginRateLimiter, (req: any, res) => {
    // existing login handler unchanged
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
npm test tests/auth.test.ts
```

Expected: all 3 auth tests PASS.

**Note:** The rate limit test consumes 10 attempts against the in-memory store. Because `DB_PATH=:memory:` creates a fresh DB per test run, the admin user is re-seeded each run, but the rate limiter's `MemoryStore` persists across tests within the same process. If tests run in the same process and order matters, add a `skip` annotation to run this test last, or use `vitest --pool=forks` for process isolation.

- [ ] **Step 5: Commit**

```bash
git add server.ts tests/auth.test.ts
git commit -m "security: rate limit /api/login to 10 attempts per 15 min per IP"
```

---

## Task 5: Enforce TLS certificate verification on VyOS proxy

**Files:**
- Modify: `server.ts`

- [ ] **Step 1: Add HTTPS agent based on ALLOW_SELF_SIGNED env var**

In `server.ts`, add this import at the top:

```typescript
import https from 'https';
```

Inside `createApp()`, before the VyOS proxy route (`app.post("/api/vyos/:routerId/:action"`), add:

```typescript
  const allowSelfSigned = process.env.ALLOW_SELF_SIGNED === 'true';
  const vyosHttpsAgent = new https.Agent({
    rejectUnauthorized: !allowSelfSigned,
  });
```

Then in the VyOS proxy route, update the Axios call to pass the agent:

```typescript
      const response = await axios.post(`${router.url}/${vyosEndpoint}`, formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 15000,
        httpsAgent: vyosHttpsAgent,
      });
```

- [ ] **Step 2: Update .env.example**

Add to `.env.example`:
```
# Set to true only for routers with self-signed certs (e.g., lab environments)
ALLOW_SELF_SIGNED=false
```

- [ ] **Step 3: Verify server still starts**

```bash
npm run dev
```

Expected: server starts normally. VyOS API calls to routers with valid certs work; self-signed certs are now rejected unless `ALLOW_SELF_SIGNED=true`.

- [ ] **Step 4: Commit**

```bash
git add server.ts .env.example
git commit -m "security: enforce TLS cert verification on VyOS API proxy"
```

---

## Task 6: Encrypt VPN shared secrets at rest

**Files:**
- Modify: `server.ts`
- Create: `tests/vpn.test.ts`

- [ ] **Step 1: Add ENCRYPTION_KEY startup check to server.ts**

Inside `createApp()`, after the `JWT_SECRET` check:

```typescript
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error(
      'FATAL: ENCRYPTION_KEY environment variable is required (must be exactly 64 hex characters, e.g., openssl rand -hex 32).'
    );
  }
  if (!/^[0-9a-f]{64}$/i.test(process.env.ENCRYPTION_KEY)) {
    throw new Error(
      'FATAL: ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes for AES-256-GCM).'
    );
  }
```

- [ ] **Step 2: Add encrypt/decrypt helpers to server.ts**

Add these two functions after the `const DB_PATH` line and before `const db = new Database`:

```typescript
function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: base64(iv[12] + tag[16] + ciphertext)
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decrypt(ciphertext: string): string {
  if (!ciphertext) return ciphertext;
  try {
    const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
    const data = Buffer.from(ciphertext, 'base64');
    const iv = data.subarray(0, 12);
    const tag = data.subarray(12, 28);
    const encrypted = data.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final('utf8');
  } catch {
    return ''; // decryption failed (e.g., corrupted or pre-encryption data)
  }
}
```

- [ ] **Step 3: Write the failing VPN test**

Create `tests/vpn.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../server';
import Database from 'better-sqlite3';
import type { Express } from 'express';

describe('VPN secret encryption', () => {
  let app: Express;
  let token: string;

  beforeAll(async () => {
    app = await createApp();
    // Get admin token
    const loginRes = await request(app)
      .post('/api/login')
      .send({ username: 'admin', password: process.env.ADMIN_PASSWORD || 'admin123' });
    token = loginRes.body.token;
  });

  it('stores shared_secret encrypted, not in plaintext', async () => {
    // Create a VPN tunnel
    const createRes = await request(app)
      .post('/api/vpn')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'test-tunnel',
        remote_peer: '10.0.0.1',
        local_address: '192.168.1.1',
        shared_secret: 'my-super-secret-psk',
        encryption: 'aes256',
      });

    expect(createRes.status).toBe(200);
    const tunnelId = createRes.body.id;

    // Read directly from DB — the raw stored value should NOT be the plaintext
    const db = new Database(process.env.DB_PATH!);
    const row = db.prepare('SELECT shared_secret FROM vpn_tunnels WHERE id = ?').get(tunnelId) as any;
    db.close();

    expect(row.shared_secret).not.toBe('my-super-secret-psk');
    expect(row.shared_secret).toBeTruthy(); // something is stored
  });

  it('returns decrypted shared_secret via GET /api/vpn', async () => {
    // Create tunnel
    await request(app)
      .post('/api/vpn')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'test-tunnel-2',
        remote_peer: '10.0.0.2',
        shared_secret: 'another-secret',
        encryption: 'aes256',
      });

    // Fetch tunnels
    const res = await request(app)
      .get('/api/vpn')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const tunnel = res.body.find((t: any) => t.name === 'test-tunnel-2');
    expect(tunnel).toBeDefined();
    expect(tunnel.shared_secret).toBe('another-secret');
  });
});
```

- [ ] **Step 4: Run to verify tests fail**

```bash
npm test tests/vpn.test.ts
```

Expected: FAIL — shared_secret stored in plaintext.

**Note:** The `DB_PATH=:memory:` in `tests/setup.ts` means each test file creates a fresh in-memory DB when `createApp()` is called. However, in-memory SQLite DBs can't be opened by a separate `new Database(':memory:')` call — it would be a new empty DB. For the direct-DB check in the first test, we need a file-based test DB path.

Update `tests/setup.ts` to use a temp file DB instead of `:memory:`:

```typescript
import { beforeAll, afterAll } from 'vitest';
import fs from 'fs';

const TEST_DB_PATH = '/tmp/vyedge-test.db';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough';
  process.env.ENCRYPTION_KEY = 'a'.repeat(64);
  process.env.DB_PATH = TEST_DB_PATH;
  process.env.NODE_ENV = 'test';
  process.env.BACKUP_DIR = '/tmp/vyedge-test-backups';
  fs.mkdirSync('/tmp/vyedge-test-backups', { recursive: true });
});

afterAll(() => {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  if (fs.existsSync(TEST_DB_PATH + '-shm')) fs.unlinkSync(TEST_DB_PATH + '-shm');
  if (fs.existsSync(TEST_DB_PATH + '-wal')) fs.unlinkSync(TEST_DB_PATH + '-wal');
});
```

- [ ] **Step 5: Encrypt on write, decrypt on read in server.ts**

In `server.ts`, find the VPN POST route and encrypt the secret before storage:

```typescript
  app.post("/api/vpn", authenticate, authorize(["admin", "operator"]), (req: any, res) => {
    const { name, remote_peer, local_address, shared_secret, encryption } = req.body;
    if (!name || !remote_peer) return res.status(400).json({ error: "Name and Remote Peer are required" });

    const tunnelId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO vpn_tunnels (
        id, name, remote_peer, local_address, shared_secret, encryption, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(tunnelId, name, remote_peer, local_address, encrypt(shared_secret || ''), encryption, 'up');

    // ... audit log unchanged
    res.json({ id: tunnelId });
  });
```

Find the VPN GET route and decrypt on read:

```typescript
  app.get("/api/vpn", authenticate, (req, res) => {
    const tunnels = db.prepare("SELECT * FROM vpn_tunnels ORDER BY created_at DESC").all();
    const decrypted = tunnels.map((t: any) => ({
      ...t,
      shared_secret: decrypt(t.shared_secret),
    }));
    res.json(decrypted);
  });
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm test tests/vpn.test.ts
```

Expected: both VPN tests PASS.

- [ ] **Step 7: Update .env.example**

```
# Required: 64 hex characters (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=
```

- [ ] **Step 8: Commit**

```bash
git add server.ts tests/vpn.test.ts tests/setup.ts .env.example
git commit -m "security: encrypt VPN shared secrets at rest with AES-256-GCM"
```

---

## Task 7: Enable SQLite WAL mode

**Files:**
- Modify: `server.ts`

- [ ] **Step 1: Add WAL pragmas after DB initialization**

In `server.ts`, find the line `const db = new Database(DB_PATH);` and add two lines immediately after:

```typescript
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');   // move existing foreign_keys line here too (remove duplicate below)
```

Remove the standalone `db.pragma('foreign_keys = ON');` line that currently appears later.

- [ ] **Step 2: Verify server still starts cleanly**

```bash
npm run dev
```

Expected: server starts. A `vy_control.db-wal` file will appear next to the database — this is correct WAL mode behavior.

- [ ] **Step 3: Commit**

```bash
git add server.ts
git commit -m "perf: enable SQLite WAL mode for better concurrent read performance"
```

---

## Task 8: Implement real backup download, stub restore clearly

**Files:**
- Modify: `server.ts`
- Create: `tests/backup.test.ts`

- [ ] **Step 1: Write the failing backup test**

Create `tests/backup.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../server';
import type { Express } from 'express';

describe('System backup', () => {
  let app: Express;
  let token: string;

  beforeAll(async () => {
    app = await createApp();
    const loginRes = await request(app)
      .post('/api/login')
      .send({ username: 'admin', password: process.env.ADMIN_PASSWORD || 'admin123' });
    token = loginRes.body.token;
  });

  it('returns a downloadable .db file on POST /api/system/backup', async () => {
    const res = await request(app)
      .post('/api/system/backup')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/octet-stream|application\/x-sqlite3/);
    expect(res.headers['content-disposition']).toMatch(/attachment.*\.db/);
    expect(res.body).toBeDefined();
  });

  it('returns 503 with explanation on POST /api/system/restore', async () => {
    const res = await request(app)
      .post('/api/system/restore')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/not yet available|coming soon/i);
  });
});
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npm test tests/backup.test.ts
```

Expected: FAIL — backup returns fake JSON, restore returns fake success.

- [ ] **Step 3: Implement real backup in server.ts**

Find the `app.post("/api/system/backup", ...)` route and replace it entirely:

```typescript
  app.post("/api/system/backup", authenticate, authorize(["admin"]), async (req: any, res) => {
    try {
      const backupDir = process.env.BACKUP_DIR || './backups';
      const fs = await import('fs');
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `vyedge-backup-${timestamp}.db`;
      const backupPath = path.join(backupDir, backupFilename);

      await db.backup(backupPath);

      db.prepare("INSERT INTO audit_logs (id, user_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)")
        .run(crypto.randomUUID(), req.user.id, 'system_backup', `Backup downloaded: ${backupFilename}`, req.clientIp);

      res.download(backupPath, backupFilename, (err) => {
        // Clean up temp backup file after download completes or fails
        try { fs.unlinkSync(backupPath); } catch {}
        if (err && !res.headersSent) {
          res.status(500).json({ error: 'Failed to send backup file' });
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Backup failed: ' + err.message });
    }
  });
```

Replace the `app.post("/api/system/restore", ...)` route:

```typescript
  app.post("/api/system/restore", authenticate, authorize(["admin"]), (req: any, res) => {
    res.status(503).json({
      error: 'Restore is not yet available in this version. Download a backup file and restore it manually by replacing the database file.',
      docs: 'https://github.com/grrttmrtn1/vyedge#backup-restore'
    });
  });
```

- [ ] **Step 4: Add BACKUP_DIR to .env.example**

```
# Directory where backup files are temporarily written during download
BACKUP_DIR=./backups
```

- [ ] **Step 5: Add backups/ to .gitignore**

Add to `.gitignore`:
```
backups/
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm test tests/backup.test.ts
```

Expected: both backup tests PASS.

- [ ] **Step 7: Commit**

```bash
git add server.ts tests/backup.test.ts .env.example .gitignore
git commit -m "fix: implement real SQLite backup download; mark restore as not yet available"
```

---

## Task 9: Fix all type errors in src/App.tsx

**Files:**
- Modify: `src/App.tsx`

These are all `id: number` parameters that should be `id: string` since the backend uses UUID strings. Also adds the missing `group_id` field to the `Router` interface.

- [ ] **Step 1: Fix the Router interface**

Find in `src/App.tsx`:

```typescript
interface Router {
  id: string;
  name: string;
  url: string;
  status: string;
}
```

Replace with:

```typescript
interface Router {
  id: string;
  name: string;
  url: string;
  status: string;
  group_id?: string;
}
```

- [ ] **Step 2: Fix handleDelete in RoutersView**

Find:
```typescript
  const handleDelete = async (id: number) => {
```
Replace with:
```typescript
  const handleDelete = async (id: string) => {
```

- [ ] **Step 3: Fix checkStatus in RoutersView**

Find:
```typescript
  const checkStatus = async (id: number) => {
```
Replace with:
```typescript
  const checkStatus = async (id: string) => {
```

- [ ] **Step 4: Fix toggleRouter in ConfigView**

Find:
```typescript
  const toggleRouter = (id: number) => {
    setSelectedRouters(prev =>
      prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]
    );
  };
```
Replace with:
```typescript
  const toggleRouter = (id: string) => {
    setSelectedRouters(prev =>
      prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]
    );
  };
```

- [ ] **Step 5: Fix handleDeleteGroup in RoutersView and UserAdminView**

Both `handleDeleteGroup` functions (one in `RoutersView`, one in `UserAdminView`) have:
```typescript
  const handleDeleteGroup = async (id: number) => {
```
Change both to:
```typescript
  const handleDeleteGroup = async (id: string) => {
```

- [ ] **Step 6: Fix handleDeleteUser in UserAdminView**

Find:
```typescript
  const handleDeleteUser = async (id: number) => {
```
Replace with:
```typescript
  const handleDeleteUser = async (id: string) => {
```

- [ ] **Step 7: Fix ConfigNode routerId prop type**

Find the `ConfigNode` function signature:
```typescript
function ConfigNode({ data, path, routerId, token }: { data: any; path: string[]; routerId: number; token: string }) {
```
Replace with:
```typescript
function ConfigNode({ data, path, routerId, token }: { data: any; path: string[]; routerId: string; token: string }) {
```

- [ ] **Step 8: Fix openEdit to use group_id correctly**

Find in `RoutersView`:
```typescript
    setEditForm({
      name: router.name,
      url: router.url,
      api_key: '',
      group_id: router.group_id?.toString() || ''
    });
```
Replace with (now that `group_id` is a string in the interface):
```typescript
    setEditForm({
      name: router.name,
      url: router.url,
      api_key: '',
      group_id: router.group_id || ''
    });
```

- [ ] **Step 9: Remove dead 'map' tab from activeTab union**

Find:
```typescript
  const [activeTab, setActiveTab] = useState<'dashboard' | 'routers' | 'config' | 'logs' | 'settings' | 'users' | 'browser' | 'map'>('dashboard');
```
Replace with:
```typescript
  const [activeTab, setActiveTab] = useState<'dashboard' | 'routers' | 'config' | 'logs' | 'settings' | 'users' | 'browser'>('dashboard');
```

- [ ] **Step 10: Verify TypeScript compiles without errors**

```bash
npx tsc --noEmit
```

Expected: zero errors related to the changed types. (There may be pre-existing unrelated errors — document them but don't fix them in this task.)

- [ ] **Step 11: Commit**

```bash
git add src/App.tsx
git commit -m "fix: correct id types from number to string throughout App.tsx"
```

---

## Task 10: Gate VyEdgeDebug behind DEV mode

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Find the VyEdgeDebug block and gate it**

Find this block in `src/App.tsx` (inside the `useEffect`):

```typescript
      // Debugging helpers
      (window as any).VyEdgeDebug = {
        fetchGroups,
        fetchRouters,
        deleteGroup: async (id: number) => {
          // ...
        },
        deleteRouter: async (id: number) => {
          // ...
        }
      };
```

Wrap the entire block:

```typescript
      // Debugging helpers (development only)
      if (import.meta.env.DEV) {
        (window as any).VyEdgeDebug = {
          fetchGroups,
          fetchRouters,
          deleteGroup: async (id: string) => {
            console.log(`[DEBUG] Manually deleting group ${id}`);
            const res = await fetch(`/api/router-groups/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`[DEBUG] Response:`, await res.json());
            fetchGroups();
          },
          deleteRouter: async (id: string) => {
            console.log(`[DEBUG] Manually deleting router ${id}`);
            const res = await fetch(`/api/routers/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`[DEBUG] Response:`, await res.json());
            fetchRouters();
          }
        };
      }
```

(Also fix `id: number` → `id: string` in the debug functions while touching this code.)

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "security: gate VyEdgeDebug window helper behind DEV mode only"
```

---

## Task 11: Create InlineConfirm component and wire delete actions

**Files:**
- Create: `src/components/InlineConfirm.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create src/components/InlineConfirm.tsx**

```typescript
import React from 'react';

interface InlineConfirmProps {
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const InlineConfirm: React.FC<InlineConfirmProps> = ({
  message = 'Are you sure?',
  onConfirm,
  onCancel,
}) => (
  <div className="flex items-center gap-2 text-xs">
    <span className="text-slate-600 font-medium">{message}</span>
    <button
      onClick={onConfirm}
      className="px-2 py-1 bg-rose-500 text-white rounded font-semibold hover:bg-rose-600 transition-colors"
    >
      Delete
    </button>
    <button
      onClick={onCancel}
      className="px-2 py-1 bg-slate-100 text-slate-700 rounded font-semibold hover:bg-slate-200 transition-colors"
    >
      Cancel
    </button>
  </div>
);
```

- [ ] **Step 2: Add pendingDelete state to RoutersView**

In the `RoutersView` component, add state:

```typescript
  const [pendingDeleteRouter, setPendingDeleteRouter] = useState<string | null>(null);
  const [pendingDeleteGroup, setPendingDeleteGroup] = useState<string | null>(null);
```

- [ ] **Step 3: Wire InlineConfirm for router deletion in RoutersView**

Find the router card's delete button:

```typescript
                  <Button variant="ghost" size="sm" className="p-2 h-auto" onClick={() => handleDelete(router.id)}>
                    <Trash2 size={14} className="text-zinc-400 hover:text-red-500 transition-colors" />
                  </Button>
```

Replace with:

```typescript
                  {pendingDeleteRouter === router.id ? (
                    <InlineConfirm
                      message="Delete?"
                      onConfirm={() => { handleDelete(router.id); setPendingDeleteRouter(null); }}
                      onCancel={() => setPendingDeleteRouter(null)}
                    />
                  ) : (
                    <Button variant="ghost" size="sm" className="p-2 h-auto" onClick={() => setPendingDeleteRouter(router.id)}>
                      <Trash2 size={14} className="text-zinc-400 hover:text-red-500 transition-colors" />
                    </Button>
                  )}
```

- [ ] **Step 4: Wire InlineConfirm for group deletion in RoutersView**

Find the group delete button in the `showManageGroups` section:

```typescript
                    <Button variant="ghost" className="p-2 h-auto text-zinc-300 group-hover:text-red-500" onClick={() => handleDeleteGroup(g.id)}>
                      <Trash2 size={14} />
                    </Button>
```

Replace with:

```typescript
                    {pendingDeleteGroup === g.id ? (
                      <InlineConfirm
                        message="Delete group?"
                        onConfirm={() => { handleDeleteGroup(g.id); setPendingDeleteGroup(null); }}
                        onCancel={() => setPendingDeleteGroup(null)}
                      />
                    ) : (
                      <Button variant="ghost" className="p-2 h-auto text-zinc-300 group-hover:text-red-500" onClick={() => setPendingDeleteGroup(g.id)}>
                        <Trash2 size={14} />
                      </Button>
                    )}
```

- [ ] **Step 5: Wire InlineConfirm for user and group deletion in UserAdminView**

Add state to `UserAdminView`:
```typescript
  const [pendingDeleteUser, setPendingDeleteUser] = useState<string | null>(null);
  const [pendingDeleteGroupAdmin, setPendingDeleteGroupAdmin] = useState<string | null>(null);
```

Replace the user delete button (inside the users table `<td>`):
```typescript
                      {u.id !== currentUser.id && (
                        pendingDeleteUser === u.id ? (
                          <InlineConfirm
                            message="Delete user?"
                            onConfirm={() => { handleDeleteUser(u.id); setPendingDeleteUser(null); }}
                            onCancel={() => setPendingDeleteUser(null)}
                          />
                        ) : (
                          <Button variant="ghost" className="p-1 h-auto text-zinc-400 hover:text-red-500" onClick={() => setPendingDeleteUser(u.id)}>
                            <Trash2 size={14} />
                          </Button>
                        )
                      )}
```

Replace the group delete button in the Router Groups card in `UserAdminView`:
```typescript
                  {pendingDeleteGroupAdmin === g.id ? (
                    <InlineConfirm
                      message="Delete group?"
                      onConfirm={() => { handleDeleteGroup(g.id); setPendingDeleteGroupAdmin(null); }}
                      onCancel={() => setPendingDeleteGroupAdmin(null)}
                    />
                  ) : (
                    <Button variant="ghost" className="p-2 h-auto text-zinc-300 hover:text-red-500 transition-colors" onClick={() => setPendingDeleteGroupAdmin(g.id)}>
                      <Trash2 size={14} />
                    </Button>
                  )}
```

- [ ] **Step 6: Add import to App.tsx**

At the top of `src/App.tsx`, add:
```typescript
import { InlineConfirm } from './components/InlineConfirm';
```

- [ ] **Step 7: Manual verification**

```bash
npm run dev
```

Navigate to Fleet tab. Click the trash icon on a router — the confirm prompt appears inline. Click Cancel — nothing is deleted. Click Delete — deletion proceeds. Verify the same for groups and users.

- [ ] **Step 8: Commit**

```bash
git add src/components/InlineConfirm.tsx src/App.tsx
git commit -m "fix: restore delete confirmations with inline confirm UI (replaces removed window.confirm)"
```

---

## Task 12: Remove hardcoded fake metrics, add skeleton loaders

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Remove fake CPU and Uptime from router cards**

In `RoutersView`, find the metrics section inside the router card:

```typescript
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
```

Replace with skeleton loaders that will be populated when Phase 4 wires real metrics:

```typescript
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">CPU Load</p>
                  <div className="h-4 bg-zinc-200 rounded animate-pulse w-12" />
                </div>
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Uptime</p>
                  <div className="h-4 bg-zinc-200 rounded animate-pulse w-16" />
                </div>
              </div>
```

- [ ] **Step 2: Fix the hardcoded "2 minutes ago" in RouterManagementView**

Find:
```typescript
            <p className="text-xs font-bold text-zinc-900">2 minutes ago</p>
```

Replace with:
```typescript
            <p className="text-xs font-bold text-zinc-400 italic">Live data in Phase 4</p>
```

- [ ] **Step 3: Fix the hardcoded VyOS version on router cards**

Find:
```typescript
                <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">v1.4.0-RC3</span>
```

Replace with:
```typescript
                <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">VyOS</span>
```

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "fix: replace hardcoded fake metrics with skeleton loaders pending Phase 4"
```

---

## Task 13: Wire the CSV export button in LogsView

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Find the broken Export CSV button**

In `LogsView`, find:
```typescript
          <Button variant="secondary" size="sm">
            <Download size={14} /> Export CSV
          </Button>
```

- [ ] **Step 2: Add onClick handler**

Replace with:

```typescript
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const headers = ['Timestamp', 'Operator', 'Action', 'Target Node', 'Details', 'IP Address'];
              const rows = logs.map(log => [
                new Date(log.timestamp).toISOString(),
                log.username || 'Unknown',
                log.action,
                log.router_name || 'System',
                `"${(log.details || '').replace(/"/g, '""')}"`,
                log.ip_address || ''
              ]);
              const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `vyedge-audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download size={14} /> Export CSV
          </Button>
```

- [ ] **Step 3: Manual verification**

```bash
npm run dev
```

Go to Audit Logs tab. Click Export CSV. Verify a `.csv` file downloads with the correct columns and data.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "fix: implement CSV export for audit logs"
```

---

## Task 14: Delete all dead code files

**Files:**
- Delete: 12 files listed below

- [ ] **Step 1: Delete unused page files and utility scripts**

```bash
git rm src/pages/Dashboard.tsx \
       src/pages/VPN.tsx \
       src/pages/Login.tsx \
       src/pages/Configuration.tsx \
       src/pages/Logs.tsx \
       src/pages/Routes.tsx \
       src/pages/Users.tsx \
       src/pages/Firewall.tsx \
       src/components/Layout.tsx \
       list_users.ts \
       list_users_full.ts \
       debug_auth.ts \
       test_login.ts
```

- [ ] **Step 2: Verify nothing imports these files**

```bash
grep -r "from.*pages/" src/ && echo "FOUND IMPORTS" || echo "No imports found"
grep -r "from.*Layout" src/ && echo "FOUND IMPORTS" || echo "No imports found"
```

Expected: "No imports found" for both.

- [ ] **Step 3: Run dev server to verify nothing broke**

```bash
npm run dev
```

Expected: server starts, app loads in browser with no console errors.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove 13 dead code files (unused pages, Layout, debug scripts)"
```

---

## Task 15: Fix .gitignore and remove committed DB file

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add DB patterns to .gitignore**

Add to `.gitignore`:

```
# SQLite database files
*.db
*.db-shm
*.db-wal
```

- [ ] **Step 2: Remove vy_control.db from git tracking**

```bash
git rm --cached vy_control.db 2>/dev/null || echo "File already untracked"
```

- [ ] **Step 3: Verify it's no longer tracked**

```bash
git status
```

Expected: `vy_control.db` does NOT appear in the staged/unstaged files. It stays on disk but git ignores it.

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "chore: add *.db to .gitignore and untrack committed database file"
```

---

## Task 16: Run full test suite and final verification

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: all tests in `tests/auth.test.ts`, `tests/vpn.test.ts`, `tests/backup.test.ts` PASS with no failures.

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors related to the changes made in this plan. Document any pre-existing errors that are out of scope for Phase 1.

- [ ] **Step 3: Verify dev server runs cleanly**

```bash
npm run dev
```

Manually verify in browser:
- Login works
- Router delete shows confirm prompt
- Group delete shows confirm prompt
- User delete shows confirm prompt
- Audit Logs CSV export downloads a file
- Router cards show skeleton loaders (not `12%` / `14d 2h`)
- No `VyEdgeDebug` on `window` in production build

- [ ] **Step 4: Final commit if any loose files**

```bash
git status
# If anything unstaged:
git add -p
git commit -m "fix: phase 1 cleanup"
```

---

## What This Does NOT Fix (Phase 2+)

- `alert()` calls throughout the app — replaced with Toast system in Phase 2
- `ConfirmModal` — the `InlineConfirm` from Task 11 is a Phase 1 stopgap; replaced with a proper modal in Phase 2
- The `App.tsx` monolith (2465 lines) — split in Phase 2
- Duplicate UI components (`Card`/`Button`/`Input` in both `App.tsx` and `UI.tsx`) — consolidated in Phase 2
- SSO settings stored but never enforced — implementation in Phase 6
- VPN/Firewall/Routes local DB tables not connected to VyOS — real VyOS wiring in Phase 5
- No real-time metrics — Phase 4
