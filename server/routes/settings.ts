import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../db.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const UpdateSettingSchema = z.object({
  key: z.string().min(1, 'Key is required'),
  value: z.union([z.string(), z.boolean(), z.number()]),
});

const router = Router();

router.get('/system-info', authenticate, (_req, res) => {
  res.json({
    uptime: process.uptime(),
    version: 'v2.5.0-enterprise',
    node_version: process.version,
    memory: process.memoryUsage(),
    platform: process.platform,
    arch: process.arch,
  });
});

router.get('/settings', authenticate, (_req, res) => {
  const settings = db.prepare('SELECT * FROM settings').all();
  const settingsObj = settings.reduce((acc: any, s: any) => {
    acc[s.key] = s.value === 'true' ? true : s.value === 'false' ? false : s.value;
    return acc;
  }, {});
  res.json(settingsObj);
});

router.post('/settings', authenticate, authorize(['admin']), (req: any, res) => {
  const result = UpdateSettingSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid request', fields: result.error.flatten().fieldErrors });
  }

  const { key, value } = result.data;
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
  db.prepare('INSERT INTO audit_logs (id, user_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)')
    .run(crypto.randomUUID(), req.user.id, 'update_setting', `Updated setting: ${key}`, req.clientIp);
  res.json({ success: true });
});

export default router;
