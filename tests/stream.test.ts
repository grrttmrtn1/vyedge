import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import request from 'supertest';
import { createApp } from '../server';
import type { Express } from 'express';

describe('SSE /api/stream', () => {
  let app: Express;
  let server: http.Server;
  let serverUrl: string;
  let token: string;

  beforeAll(async () => {
    app = await createApp();
    // Start a real persistent server so we can make a raw HTTP request for
    // the SSE test — supertest's temp-server pattern hangs on SSE because
    // server.close() waits for open connections that never close.
    server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const { port } = server.address() as { port: number };
    serverUrl = `http://127.0.0.1:${port}`;

    const res = await request(app)
      .post('/api/login')
      .send({ username: 'admin', password: process.env.ADMIN_PASSWORD || 'admin123' });
    token = res.body.token;
  });

  afterAll(async () => {
    if (server) {
      server.closeAllConnections();
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
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
    // Use http.get directly to the real server so we can inspect response
    // headers and destroy the socket immediately — no supertest temp-server
    // involved, so no hung server.close() after the SSE stream opens.
    const { status, ct } = await new Promise<{ status: number; ct: string }>((resolve, reject) => {
      const req = http.get(
        `${serverUrl}/api/stream?token=${encodeURIComponent(token)}`,
        (res) => {
          resolve({ status: res.statusCode!, ct: res.headers['content-type'] ?? '' });
          req.destroy(); // close the SSE connection immediately after headers
        }
      );
      req.on('error', (err: any) => {
        if (err.code === 'ECONNRESET') return; // expected when we destroy
        reject(err);
      });
      setTimeout(() => reject(new Error('SSE connection did not respond within 3s')), 3000);
    });

    expect(status).toBe(200);
    expect(ct).toMatch(/text\/event-stream/);
  });
});
