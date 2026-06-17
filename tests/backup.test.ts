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
    expect(res.headers['content-disposition']).toMatch(/attachment.*\.db/);
    expect(Buffer.isBuffer(res.body) || res.body).toBeTruthy();
  });

  it('returns 503 with explanation on POST /api/system/restore', async () => {
    const res = await request(app)
      .post('/api/system/restore')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/not yet available|coming soon/i);
  });
});
