import { Router } from 'express';
import { db } from '../db.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', authenticate, authorize(['admin', 'operator']), (req: any, res) => {
  const { user, action, router: routerFilter, start, end } = req.query;

  let query = `
    SELECT audit_logs.*, users.username, routers.name as router_name
    FROM audit_logs
    LEFT JOIN users ON audit_logs.user_id = users.id
    LEFT JOIN routers ON audit_logs.target_router_id = routers.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (user) { query += ' AND users.username LIKE ?'; params.push(`%${user}%`); }
  if (action) { query += ' AND audit_logs.action LIKE ?'; params.push(`%${action}%`); }
  if (routerFilter) {
    query += ' AND (routers.name LIKE ? OR audit_logs.details LIKE ?)';
    params.push(`%${routerFilter}%`, `%${routerFilter}%`);
  }
  if (start) { query += ' AND audit_logs.timestamp >= ?'; params.push(start); }
  if (end) { query += ' AND audit_logs.timestamp <= ?'; params.push(end); }

  query += ' ORDER BY timestamp DESC LIMIT 500';

  res.json(db.prepare(query).all(...params));
});

export default router;
