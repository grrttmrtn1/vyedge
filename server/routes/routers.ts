import { Router } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import https from 'https';
import { z } from 'zod';
import { db } from '../db.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const CreateRouterSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('Must be a valid URL').refine(u => u.startsWith('https://'), 'URL must start with https://'),
  api_key: z.string().min(1, 'API Key is required'),
  group_id: z.string().optional(),
});

const UpdateRouterSchema = z.object({
  name: z.string().min(1).optional(),
  url: z.string().url().refine(u => u.startsWith('https://')).optional(),
  api_key: z.string().min(1).optional(),
  group_id: z.string().nullable().optional(),
});

const allowSelfSigned = process.env.ALLOW_SELF_SIGNED === 'true';
const vyosHttpsAgent = new https.Agent({ rejectUnauthorized: !allowSelfSigned });

const router = Router();

router.get('/', authenticate, (req: any, res) => {
  let routers;
  if (req.user.role === 'admin') {
    routers = db.prepare('SELECT id, name, url, status, group_id FROM routers WHERE tenant_id = ?').all(req.user.tenant);
  } else {
    const assignedGroups = db.prepare('SELECT COUNT(*) as count FROM user_router_groups WHERE user_id = ?').get(req.user.id) as any;
    if (assignedGroups.count === 0) {
      routers = db.prepare('SELECT id, name, url, status, group_id FROM routers WHERE tenant_id = ?').all(req.user.tenant);
    } else {
      routers = db.prepare(`
        SELECT r.id, r.name, r.url, r.status, r.group_id
        FROM routers r
        JOIN user_router_groups urg ON r.group_id = urg.group_id
        WHERE r.tenant_id = ? AND urg.user_id = ?
      `).all(req.user.tenant, req.user.id);
    }
  }
  res.json(routers);
});

router.post('/', authenticate, authorize(['admin']), (req: any, res) => {
  const result = CreateRouterSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid request', fields: result.error.flatten().fieldErrors });
  }

  const { name, url, api_key, group_id } = result.data;

  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  try {
    const routerId = crypto.randomUUID();
    db.prepare('INSERT INTO routers (id, name, url, api_key, group_id, tenant_id) VALUES (?, ?, ?, ?, ?, ?)')
      .run(routerId, name, url, api_key, group_id || null, req.user.tenant);
    db.prepare('INSERT INTO audit_logs (id, user_id, action, target_router_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
      .run(crypto.randomUUID(), req.user.id, 'add_router', routerId, JSON.stringify({ name, url }), req.clientIp);
    res.json({ id: routerId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', authenticate, authorize(['admin']), (req: any, res) => {
  const result = UpdateRouterSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid request', fields: result.error.flatten().fieldErrors });
  }

  const routerId = req.params.id;
  const { name, url, api_key, group_id } = result.data;

  try {
    const existing: any = db.prepare('SELECT * FROM routers WHERE id = ? AND tenant_id = ?').get(routerId, req.user.tenant);
    if (!existing) return res.status(404).json({ error: 'Router not found' });

    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (url !== undefined) { updates.push('url = ?'); values.push(url); }
    if (api_key !== undefined) { updates.push('api_key = ?'); values.push(api_key); }
    if (group_id !== undefined) { updates.push('group_id = ?'); values.push(group_id || null); }

    if (updates.length === 0) return res.json({ success: true });

    values.push(routerId, req.user.tenant);
    db.prepare(`UPDATE routers SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`).run(...values);
    db.prepare('INSERT INTO audit_logs (id, user_id, action, target_router_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
      .run(crypto.randomUUID(), req.user.id, 'update_router', routerId, JSON.stringify(req.body), req.clientIp);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.all('/:id', (req: any, _res, next) => {
  console.log(`[DEBUG] ${req.method} request to /api/routers/${req.params.id} from ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}`);
  next();
});

router.delete('/:id', authenticate, authorize(['admin']), (req: any, res) => {
  const routerId = req.params.id;
  const tenant = req.user.tenant;
  console.log(`[DELETE] Router request - ID: ${routerId}, User: ${req.user.username}, Tenant: ${tenant}`);

  try {
    const r: any = db.prepare('SELECT name, tenant_id FROM routers WHERE id = ?').get(routerId);
    if (!r) {
      console.warn(`[DELETE] Router ${routerId} not found`);
      return res.status(404).json({ error: 'Router not found' });
    }

    if (req.user.role !== 'admin' && r.tenant_id !== tenant && tenant !== 'default') {
      return res.status(403).json({ error: 'Access denied to this router' });
    }

    const info = db.prepare('DELETE FROM routers WHERE id = ?').run(routerId);
    if (info.changes > 0) {
      db.prepare('INSERT INTO audit_logs (id, user_id, action, target_router_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
        .run(crypto.randomUUID(), req.user.id, 'delete_router', routerId, JSON.stringify({ name: r.name }), req.clientIp);
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to delete router record' });
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete router: ' + err.message });
  }
});

router.post('/:id/check', authenticate, async (req: any, res) => {
  const r: any = db.prepare('SELECT * FROM routers WHERE id = ? AND tenant_id = ?').get(req.params.id, req.user.tenant);
  if (!r) return res.status(404).json({ error: 'Router not found' });

  try {
    const formData = new URLSearchParams();
    formData.append('key', r.api_key);
    formData.append('data', JSON.stringify({ op: 'showConfig', path: [] }));

    await axios.post(`${r.url}/retrieve`, formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 5000,
      httpsAgent: vyosHttpsAgent,
    });

    db.prepare("UPDATE routers SET status = 'online', last_check = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    res.json({ status: 'online' });
  } catch {
    db.prepare("UPDATE routers SET status = 'offline', last_check = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    res.json({ status: 'offline' });
  }
});

export default router;
