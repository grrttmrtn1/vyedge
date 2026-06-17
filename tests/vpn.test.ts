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
    const loginRes = await request(app)
      .post('/api/login')
      .send({ username: 'admin', password: process.env.ADMIN_PASSWORD || 'admin123' });
    token = loginRes.body.token;
  });

  it('stores shared_secret encrypted, not in plaintext', async () => {
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

    // Open DB directly to verify the raw stored value is NOT plaintext
    const db = new Database(process.env.DB_PATH!);
    const row = db.prepare('SELECT shared_secret FROM vpn_tunnels WHERE id = ?').get(tunnelId) as any;
    db.close();

    expect(row.shared_secret).not.toBe('my-super-secret-psk');
    expect(row.shared_secret).toBeTruthy();
  });

  it('returns decrypted shared_secret via GET /api/vpn', async () => {
    await request(app)
      .post('/api/vpn')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'test-tunnel-2',
        remote_peer: '10.0.0.2',
        shared_secret: 'another-secret',
        encryption: 'aes256',
      });

    const res = await request(app)
      .get('/api/vpn')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const tunnel = res.body.find((t: any) => t.name === 'test-tunnel-2');
    expect(tunnel).toBeDefined();
    expect(tunnel.shared_secret).toBe('another-secret');
  });
});
