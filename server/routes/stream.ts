import { Router } from 'express';
import type { Response, Request } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { collectRouterMetrics } from '../services/metrics.js';
import { evaluateAlerts } from '../services/alertEngine.js';

const router = Router();

interface SseClient { res: Response; userId: string; tenant: string; role: string; }

// Module-level registry — intentional singleton for the lifetime of the process
const clients = new Map<string, SseClient>();
let pollTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Returns the set of router IDs accessible to a given user, applying the same
 * tenant + group-membership filter used by GET /api/routers.
 */
function getAccessibleRouterIds(userId: string, tenant: string, role: string): Set<string> {
  let rows: Array<{ id: string }>;
  if (role === 'admin') {
    rows = db.prepare('SELECT id FROM routers WHERE tenant_id = ?').all(tenant) as Array<{ id: string }>;
  } else {
    const assignedGroups = db.prepare('SELECT COUNT(*) as count FROM user_router_groups WHERE user_id = ?').get(userId) as { count: number };
    if (assignedGroups.count === 0) {
      rows = db.prepare('SELECT id FROM routers WHERE tenant_id = ?').all(tenant) as Array<{ id: string }>;
    } else {
      rows = db.prepare(`
        SELECT r.id
        FROM routers r
        JOIN user_router_groups urg ON r.group_id = urg.group_id
        WHERE r.tenant_id = ? AND urg.user_id = ?
      `).all(tenant, userId) as Array<{ id: string }>;
    }
  }
  return new Set(rows.map(r => r.id));
}

async function pollMetrics() {
  if (clients.size === 0) return;

  // Resolve accessible router IDs once per unique user, not once per client
  const userAccessMap = new Map<string, Set<string>>();
  clients.forEach(({ userId, tenant, role }) => {
    if (!userAccessMap.has(userId)) {
      userAccessMap.set(userId, getAccessibleRouterIds(userId, tenant, role));
    }
  });

  // Fetch only routers that at least one connected user can access
  const allAccessibleIds = new Set<string>();
  userAccessMap.forEach(ids => ids.forEach(id => allAccessibleIds.add(id)));

  if (allAccessibleIds.size === 0) return;

  const placeholders = Array.from(allAccessibleIds).map(() => '?').join(', ');
  const routers = db.prepare(
    `SELECT id, url, api_key FROM routers WHERE id IN (${placeholders})`
  ).all(...Array.from(allAccessibleIds)) as Array<{ id: string; url: string; api_key: string }>;

  await Promise.allSettled(
    routers.map(async (r) => {
      try {
        const metrics = await collectRouterMetrics(r);
        const metricsMsg = `data: ${JSON.stringify({ type: 'metrics', routerId: r.id, payload: metrics })}\n\n`;

        // Only write to clients that are authorized to see this router
        clients.forEach(({ res, userId }) => {
          if (userAccessMap.get(userId)?.has(r.id)) {
            res.write(metricsMsg);
          }
        });

        const alerts = evaluateAlerts(r.id, metrics);
        for (const alert of alerts) {
          const alertMsg = `data: ${JSON.stringify(alert)}\n\n`;
          clients.forEach(({ res, userId }) => {
            if (userAccessMap.get(userId)?.has(r.id)) {
              res.write(alertMsg);
            }
          });
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

  let user: jwt.JwtPayload & { id: string; tenant: string; role: string };
  try {
    user = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] }) as jwt.JwtPayload & { id: string; tenant: string; role: string };
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = crypto.randomUUID();
  clients.set(clientId, { res, userId: user.id, tenant: user.tenant, role: user.role });

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
