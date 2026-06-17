import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../db.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const CreateGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required'),
});

const router = Router();

router.get('/', authenticate, (req: any, res) => {
  try {
    let groups;
    const { username, role, tenant, id: userId } = req.user;

    console.log(`[SERVER] GET /api/router-groups requested by ${username} (Role: ${role}, Tenant: ${tenant})`);

    if (role === 'admin') {
      groups = db.prepare(`
        SELECT rg.*, (SELECT COUNT(*) FROM routers r WHERE r.group_id = rg.id) as node_count
        FROM router_groups rg
      `).all();
    } else {
      const assignedGroups = db.prepare('SELECT COUNT(*) as count FROM user_router_groups WHERE user_id = ?').get(userId) as any;
      if (assignedGroups.count === 0) {
        groups = db.prepare(`
          SELECT rg.*, (SELECT COUNT(*) FROM routers r WHERE r.group_id = rg.id) as node_count
          FROM router_groups rg WHERE rg.tenant_id = ?
        `).all(tenant);
      } else {
        groups = db.prepare(`
          SELECT rg.*, (SELECT COUNT(*) FROM routers r WHERE r.group_id = rg.id) as node_count
          FROM router_groups rg
          JOIN user_router_groups urg ON rg.id = urg.group_id
          WHERE rg.tenant_id = ? AND urg.user_id = ?
        `).all(tenant, userId);
      }
    }

    if (!groups) groups = [];
    console.log(`[SERVER] Returning ${groups.length} groups`);
    res.json(groups);
  } catch (err: any) {
    console.error('[SERVER] Error fetching router groups:', err);
    res.status(500).json({ error: 'Failed to fetch groups', details: err.message });
  }
});

router.all('/:id', (req: any, _res, next) => {
  console.log(`[DEBUG] ${req.method} request to /api/router-groups/${req.params.id} from ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}`);
  next();
});

router.delete('/:id', authenticate, authorize(['admin']), (req: any, res) => {
  const groupId = req.params.id;
  console.log(`[CRITICAL] DELETE /api/router-groups/${groupId} initiated by ${req.user.username}`);

  try {
    const group: any = db.prepare('SELECT * FROM router_groups WHERE id = ?').get(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    db.prepare('UPDATE routers SET group_id = NULL WHERE group_id = ?').run(groupId);
    db.prepare('DELETE FROM user_router_groups WHERE group_id = ?').run(groupId);
    const info = db.prepare('DELETE FROM router_groups WHERE id = ?').run(groupId);

    const remaining = db.prepare('SELECT COUNT(*) as count FROM router_groups').get() as any;

    if (info.changes > 0) {
      db.prepare('INSERT INTO audit_logs (id, user_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)')
        .run(crypto.randomUUID(), req.user.id, 'delete_group', `Deleted router group: ${group.name} (ID: ${groupId})`, req.clientIp);
      res.json({ success: true, remaining: remaining.count });
    } else {
      res.status(500).json({ error: 'Failed to delete group record' });
    }
  } catch (err: any) {
    console.error('[CRITICAL] UNEXPECTED ERROR during group deletion:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

router.post('/', authenticate, authorize(['admin']), (req: any, res) => {
  const result = CreateGroupSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid request', fields: result.error.flatten().fieldErrors });
  }

  const { name } = result.data;
  try {
    const groupId = crypto.randomUUID();
    db.prepare('INSERT INTO router_groups (id, name, tenant_id) VALUES (?, ?, ?)').run(groupId, name, req.user.tenant);
    db.prepare('INSERT INTO audit_logs (id, user_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)')
      .run(crypto.randomUUID(), req.user.id, 'create_group', `Created router group: ${name}`, req.clientIp);
    res.json({ id: groupId });
  } catch {
    res.status(400).json({ error: 'Group already exists' });
  }
});

export default router;
