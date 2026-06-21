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
