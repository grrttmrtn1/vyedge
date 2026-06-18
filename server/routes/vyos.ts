import { Router } from 'express';
import axios from 'axios';
import https from 'https';
import crypto from 'crypto';
import { db } from '../db.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const allowSelfSigned = process.env.ALLOW_SELF_SIGNED === 'true';
const vyosHttpsAgent = new https.Agent({ rejectUnauthorized: !allowSelfSigned });

const router = Router();

router.post('/:routerId/:action', authenticate, authorize(['admin', 'operator']), async (req: any, res) => {
  const { routerId, action } = req.params;
  const { data } = req.body;

  const r: any = db.prepare(`
    SELECT r.*
    FROM routers r
    LEFT JOIN user_router_groups urg ON r.group_id = urg.group_id
    WHERE r.id = ? AND r.tenant_id = ? AND (urg.user_id = ? OR ? = 'admin')
  `).get(routerId, req.user.tenant, req.user.id, req.user.role);

  if (!r) return res.status(404).json({ error: 'Router not found or access denied' });

  try {
    const formData = new URLSearchParams();
    formData.append('key', r.api_key);

    let vyosEndpoint = action;
    if (action === 'show') vyosEndpoint = 'retrieve';
    if (action === 'op') vyosEndpoint = 'op';
    if (action === 'configure') vyosEndpoint = 'configure';

    formData.append('data', JSON.stringify(data));

    const response = await axios.post(`${r.url}/${vyosEndpoint}`, formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000,
      httpsAgent: vyosHttpsAgent,
    });

    db.prepare('INSERT INTO audit_logs (id, user_id, action, target_router_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
      .run(crypto.randomUUID(), req.user.id, `vyos_${action}`, routerId, JSON.stringify(data), req.clientIp);

    res.json(response.data);
  } catch (err: any) {
    console.error('VyOS API Error:', err.message);
    res.status(500).json({ error: 'Failed to communicate with VyOS', details: err.message });
  }
});

export default router;
