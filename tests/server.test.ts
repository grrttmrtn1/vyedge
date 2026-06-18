// Env vars (JWT_SECRET, ENCRYPTION_KEY, DB_PATH) are set in tests/setup.ts
// which runs before any modules are imported, ensuring module-level constants
// in server code capture the correct values at load time.

import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/index.js';
import fs from 'fs';
import type { Express } from 'express';

let app: Express;

beforeAll(async () => {
  app = await createApp();
});

afterAll(() => {
  const dbPath = process.env.DB_PATH;
  if (dbPath && dbPath !== ':memory:' && fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
});

// --- Auth (3 tests) ---

describe('POST /api/login', () => {
  it('returns 400 when body is missing username', async () => {
    const res = await request(app).post('/api/login').send({ password: 'secret' });
    expect(res.status).toBe(400);
  });

  it('returns 401 for invalid credentials', async () => {
    const res = await request(app).post('/api/login').send({ username: 'nobody', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('returns 200 with token for valid admin credentials', async () => {
    const res = await request(app).post('/api/login').send({ username: 'admin', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.username).toBe('admin');
  });
});

// --- VPN (2 tests) ---

describe('VPN endpoints require auth', () => {
  it('GET /api/vpn returns 401 without token', async () => {
    const res = await request(app).get('/api/vpn');
    expect(res.status).toBe(401);
  });

  it('POST /api/vpn returns 401 without token', async () => {
    const res = await request(app).post('/api/vpn').send({ name: 'test', remote_peer: '1.2.3.4' });
    expect(res.status).toBe(401);
  });
});

// --- Backup (2 tests) ---

describe('System backup/restore require auth', () => {
  it('POST /api/system/backup returns 401 without token', async () => {
    const res = await request(app).post('/api/system/backup');
    expect(res.status).toBe(401);
  });

  it('POST /api/system/restore returns 401 without token', async () => {
    const res = await request(app).post('/api/system/restore');
    expect(res.status).toBe(401);
  });
});

// --- Server (1 test) ---

describe('createApp()', () => {
  it('throws if JWT_SECRET is missing', async () => {
    const original = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    await expect(createApp()).rejects.toThrow('JWT_SECRET');
    process.env.JWT_SECRET = original;
  });
});
