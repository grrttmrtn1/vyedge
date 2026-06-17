import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../db.js';
import { loginRateLimiter } from '../middleware/rateLimit.js';

const JWT_SECRET = process.env.JWT_SECRET!;

const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const router = Router();

router.post('/login', loginRateLimiter, (req: any, res) => {
  const result = LoginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid request', fields: result.error.flatten().fieldErrors });
  }

  const { username, password } = result.data;
  const user: any = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, tenant: user.tenant_id },
      JWT_SECRET
    );
    db.prepare('INSERT INTO audit_logs (id, user_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)')
      .run(crypto.randomUUID(), user.id, 'login', 'User logged in successfully', req.clientIp);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } else {
    db.prepare('INSERT INTO audit_logs (id, action, details, ip_address) VALUES (?, ?, ?, ?)')
      .run(crypto.randomUUID(), 'login_failed', `Failed login attempt for username: ${username}`, req.clientIp);
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

export default router;
