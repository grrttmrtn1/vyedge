import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../server/index.js';
import { db } from '../server/db.js';

function makeToken(payload = { id: 'u1', role: 'admin', tenant: 'default' }) {
  return jwt.sign(payload, process.env.JWT_SECRET!);
}

function seedRouter(id: string) {
  db.prepare(
    'INSERT OR IGNORE INTO routers (id, name, url, api_key, tenant_id) VALUES (?, ?, ?, ?, ?)'
  ).run(id, id, 'http://localhost', 'test-key', 'default');
}

describe('Firewall drafts API', () => {
  let app: any;
  let token: string;

  beforeEach(async () => {
    app = await createApp();
    token = makeToken();
  });

  it('GET /api/firewall/:routerId/drafts returns 404 for unknown router', async () => {
    const res = await supertest(app)
      .get('/api/firewall/nonexistent/drafts')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('POST /api/firewall/:routerId/drafts creates a draft', async () => {
    seedRouter('router-1');
    const res = await supertest(app)
      .post('/api/firewall/router-1/drafts')
      .set('Authorization', `Bearer ${token}`)
      .send({ operation: 'set', path: ['firewall', 'name', 'WAN_IN', 'rule', '10', 'action', 'accept'] });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
  });

  it('DELETE /api/firewall/:routerId/drafts/:id removes the draft', async () => {
    const routerId = `router-delete-${Date.now()}`;
    seedRouter(routerId);

    // Create first
    const createRes = await supertest(app)
      .post(`/api/firewall/${routerId}/drafts`)
      .set('Authorization', `Bearer ${token}`)
      .send({ operation: 'set', path: ['firewall', 'name', 'WAN_IN', 'rule', '10', 'action', 'accept'] });
    const { id } = createRes.body;

    // Delete
    const deleteRes = await supertest(app)
      .delete(`/api/firewall/${routerId}/drafts/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    // Verify gone
    const listRes = await supertest(app)
      .get(`/api/firewall/${routerId}/drafts`)
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.body).toHaveLength(0);
  });

  it('GET /api/firewall/:routerId/drafts returns 401 without token', async () => {
    const res = await supertest(app).get('/api/firewall/router-1/drafts');
    expect(res.status).toBe(401);
  });
});
