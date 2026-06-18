import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { db, validatePassword } from '../db.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const CreateUserSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'operator', 'read-only']),
});

const UpdatePasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const UpdateGroupsSchema = z.object({
  groupIds: z.array(z.string()),
});

const router = Router();

router.get('/', authenticate, authorize(['admin']), (_req, res) => {
  const users = db.prepare('SELECT id, username, role, tenant_id FROM users').all();
  const usersWithGroups = users.map((u: any) => {
    const userGroups = db.prepare(`
      SELECT rg.name
      FROM router_groups rg
      JOIN user_router_groups urg ON rg.id = urg.group_id
      WHERE urg.user_id = ?
    `).all(u.id);
    return { ...u, groups: userGroups.map((g: any) => g.name) };
  });
  res.json(usersWithGroups);
});

router.post('/', authenticate, authorize(['admin']), (req: any, res) => {
  const result = CreateUserSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid request', fields: result.error.flatten().fieldErrors });
  }

  const { username, password, role } = result.data;
  const passwordError = validatePassword(password);
  if (passwordError) return res.status(400).json({ error: passwordError });

  const hashedPassword = bcrypt.hashSync(password, 10);
  try {
    const userId = crypto.randomUUID();
    db.prepare('INSERT INTO users (id, username, password, role, tenant_id) VALUES (?, ?, ?, ?, ?)').run(userId, username, hashedPassword, role, req.user.tenant);
    db.prepare('INSERT INTO audit_logs (id, user_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)')
      .run(crypto.randomUUID(), req.user.id, 'create_user', `Created user: ${username} with role: ${role}`, req.clientIp);
    res.json({ id: userId });
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

router.patch('/:id/password', authenticate, authorize(['admin']), (req: any, res) => {
  const result = UpdatePasswordSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid request', fields: result.error.flatten().fieldErrors });
  }

  const { password } = result.data;
  const passwordError = validatePassword(password);
  if (passwordError) return res.status(400).json({ error: passwordError });

  const hashedPassword = bcrypt.hashSync(password, 10);
  const user: any = db.prepare('SELECT username FROM users WHERE id = ?').get(req.params.id);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.params.id);

  if (user) {
    db.prepare('INSERT INTO audit_logs (id, user_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)')
      .run(crypto.randomUUID(), req.user.id, 'update_user_password', `Updated password for user: ${user.username}`, req.clientIp);
  }
  res.json({ success: true });
});

router.delete('/:id', authenticate, authorize(['admin']), (req: any, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });

  const user: any = db.prepare('SELECT username FROM users WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM user_router_groups WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);

  if (user) {
    db.prepare('INSERT INTO audit_logs (id, user_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)')
      .run(crypto.randomUUID(), req.user.id, 'delete_user', `Deleted user: ${user.username}`, req.clientIp);
  }
  res.json({ success: true });
});

router.get('/:id/groups', authenticate, authorize(['admin']), (req, res) => {
  const groups = db.prepare('SELECT group_id FROM user_router_groups WHERE user_id = ?').all(req.params.id);
  res.json(groups.map((g: any) => g.group_id));
});

router.put('/:id/groups', authenticate, authorize(['admin']), (req: any, res) => {
  const result = UpdateGroupsSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid request', fields: result.error.flatten().fieldErrors });
  }

  const { groupIds } = result.data;
  const userId = req.params.id;

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM user_router_groups WHERE user_id = ?').run(userId);
    const insert = db.prepare('INSERT INTO user_router_groups (user_id, group_id) VALUES (?, ?)');
    for (const groupId of groupIds) {
      insert.run(userId, groupId);
    }
  });

  try {
    tx();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
