import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../server/index.js';

function makeToken(payload = { id: 'u1', role: 'admin', tenant: 'default' }) {
  return jwt.sign(payload, process.env.JWT_SECRET!);
}

describe('Firewall drafts API', () => {
  let app: any;
  let token: string;

  beforeEach(async () => {
    app = await createApp();
    token = makeToken();
  });

  it('GET /api/firewall/:routerId/drafts returns empty array for unknown router', async () => {
    const res = await supertest(app)
      .get('/api/firewall/nonexistent/drafts')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST /api/firewall/:routerId/drafts creates a draft', async () => {
    const res = await supertest(app)
      .post('/api/firewall/router-1/drafts')
      .set('Authorization', `Bearer ${token}`)
      .send({ operation: 'set', path: ['firewall', 'name', 'WAN_IN', 'rule', '10', 'action', 'accept'] });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
  });

  it('DELETE /api/firewall/:routerId/drafts/:id removes the draft', async () => {
    const routerId = `router-delete-${Date.now()}`;

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
