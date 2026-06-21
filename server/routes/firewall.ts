import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../db.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import axios from 'axios';
import https from 'https';

const router = Router();
const allowSelfSigned = process.env.ALLOW_SELF_SIGNED === 'true';
const vyosHttpsAgent = new https.Agent({ rejectUnauthorized: !allowSelfSigned });

const DraftSchema = z.object({
  operation: z.enum(['set', 'delete']),
  path: z.array(z.string()).min(1),
  value: z.string().optional(),
});

router.get('/:routerId/drafts', authenticate, (req: any, res) => {
  const drafts = db.prepare(
    'SELECT * FROM firewall_drafts WHERE router_id = ? ORDER BY created_at ASC'
  ).all(req.params.routerId);
  res.json(drafts.map((d: any) => ({ ...d, path: JSON.parse(d.path) })));
});

router.post('/:routerId/drafts', authenticate, authorize(['admin', 'operator']), (req: any, res) => {
  const result = DraftSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: 'Invalid draft', fields: result.error.flatten().fieldErrors });

  const { operation, path, value } = result.data;
  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO firewall_drafts (id, router_id, operation, path, value) VALUES (?, ?, ?, ?, ?)'
  ).run(id, req.params.routerId, operation, JSON.stringify(path), value ?? null);

  res.status(201).json({ id });
});

router.delete('/:routerId/drafts/:id', authenticate, authorize(['admin', 'operator']), (req: any, res) => {
  db.prepare('DELETE FROM firewall_drafts WHERE id = ? AND router_id = ?')
    .run(req.params.id, req.params.routerId);
  res.json({ success: true });
});

router.post('/:routerId/deploy', authenticate, authorize(['admin', 'operator']), async (req: any, res) => {
  const r = db.prepare('SELECT * FROM routers WHERE id = ? AND tenant_id = ?')
    .get(req.params.routerId, req.user.tenant) as any;
  if (!r) return res.status(404).json({ error: 'Router not found' });

  const drafts = db.prepare(
    'SELECT * FROM firewall_drafts WHERE router_id = ? ORDER BY created_at ASC'
  ).all(req.params.routerId) as any[];

  if (drafts.length === 0) return res.json({ applied: 0 });

  try {
    for (const draft of drafts) {
      const path: string[] = JSON.parse(draft.path);
      const data: Record<string, any> = { op: draft.operation, path };
      if (draft.value !== null) data.value = draft.value;

      const formData = new URLSearchParams();
      formData.append('key', r.api_key);
      formData.append('data', JSON.stringify(data));
      await axios.post(`${r.url}/configure`, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
        httpsAgent: vyosHttpsAgent,
      });
    }

    // commit + save
    for (const op of ['commit', 'save']) {
      const formData = new URLSearchParams();
      formData.append('key', r.api_key);
      formData.append('data', JSON.stringify({ op }));
      await axios.post(`${r.url}/configure`, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
        httpsAgent: vyosHttpsAgent,
      });
    }

    db.prepare('DELETE FROM firewall_drafts WHERE router_id = ?').run(req.params.routerId);
    db.prepare('INSERT INTO audit_logs (id, user_id, action, target_router_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
      .run(crypto.randomUUID(), req.user.id, 'firewall_deploy', req.params.routerId, `Deployed ${drafts.length} firewall draft(s)`, req.clientIp);

    res.json({ applied: drafts.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Deploy failed', details: err.message });
  }
});

export default router;
