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

  it('returns 429 after 10 failed login attempts', async () => {
    const failedLogin = () =>
      request(app)
        .post('/api/login')
        .send({ username: 'admin', password: 'wrong' });

    for (let i = 0; i < 10; i++) {
      await failedLogin();
    }

    const res = await failedLogin();
    expect(res.status).toBe(429);
  });
});
