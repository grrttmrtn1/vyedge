import { Router } from 'express';
import crypto from 'crypto';
import { db, encrypt, decrypt } from '../db.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

// Static Routes
router.get('/routes', authenticate, (_req, res) => {
  res.json(db.prepare('SELECT * FROM routes ORDER BY created_at DESC').all());
});

router.post('/routes', authenticate, authorize(['admin', 'operator']), (req: any, res) => {
  const { destination, next_hop, interface: iface, description } = req.body;
  if (!destination || !next_hop) return res.status(400).json({ error: 'Destination and Next Hop are required' });

  const routeId = crypto.randomUUID();
  db.prepare('INSERT INTO routes (id, destination, next_hop, interface, description) VALUES (?, ?, ?, ?, ?)')
    .run(routeId, destination, next_hop, iface, description);
  db.prepare('INSERT INTO audit_logs (id, user_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)')
    .run(crypto.randomUUID(), req.user.id, 'add_route', `Added static route: ${destination} via ${next_hop}`, req.clientIp);
  res.json({ id: routeId });
});

router.delete('/routes/:id', authenticate, authorize(['admin']), (req: any, res) => {
  db.prepare('DELETE FROM routes WHERE id = ?').run(req.params.id);
  db.prepare('INSERT INTO audit_logs (id, user_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)')
    .run(crypto.randomUUID(), req.user.id, 'delete_route', `Deleted static route ID: ${req.params.id}`, req.clientIp);
  res.json({ success: true });
});

// Firewall Rules
router.get('/firewall', authenticate, (_req, res) => {
  res.json(db.prepare('SELECT * FROM firewall_rules ORDER BY created_at DESC').all());
});

router.post('/firewall', authenticate, authorize(['admin', 'operator']), (req: any, res) => {
  const { action, protocol, source_address, source_port, destination_address, destination_port, description } = req.body;

  const ruleId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO firewall_rules (id, action, protocol, source_address, source_port, destination_address, destination_port, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(ruleId, action, protocol, source_address, source_port, destination_address, destination_port, description);
  db.prepare('INSERT INTO audit_logs (id, user_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)')
    .run(crypto.randomUUID(), req.user.id, 'add_firewall_rule', `Added firewall rule: ${action} ${protocol} from ${source_address || 'any'} to ${destination_address || 'any'}`, req.clientIp);
  res.json({ id: ruleId });
});

router.delete('/firewall/:id', authenticate, authorize(['admin']), (req: any, res) => {
  db.prepare('DELETE FROM firewall_rules WHERE id = ?').run(req.params.id);
  db.prepare('INSERT INTO audit_logs (id, user_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)')
    .run(crypto.randomUUID(), req.user.id, 'delete_firewall_rule', `Deleted firewall rule ID: ${req.params.id}`, req.clientIp);
  res.json({ success: true });
});

// VPN Tunnels
router.get('/vpn', authenticate, (_req, res) => {
  const tunnels = db.prepare('SELECT * FROM vpn_tunnels ORDER BY created_at DESC').all();
  res.json(tunnels.map((t: any) => ({ ...t, shared_secret: decrypt(t.shared_secret) })));
});

router.post('/vpn', authenticate, authorize(['admin', 'operator']), (req: any, res) => {
  const { name, remote_peer, local_address, shared_secret, encryption } = req.body;
  if (!name || !remote_peer) return res.status(400).json({ error: 'Name and Remote Peer are required' });

  const tunnelId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO vpn_tunnels (id, name, remote_peer, local_address, shared_secret, encryption, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(tunnelId, name, remote_peer, local_address, encrypt(shared_secret || ''), encryption, 'up');
  db.prepare('INSERT INTO audit_logs (id, user_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)')
    .run(crypto.randomUUID(), req.user.id, 'add_vpn_tunnel', `Established VPN tunnel: ${name} to ${remote_peer}`, req.clientIp);
  res.json({ id: tunnelId });
});

router.delete('/vpn/:id', authenticate, authorize(['admin']), (req: any, res) => {
  db.prepare('DELETE FROM vpn_tunnels WHERE id = ?').run(req.params.id);
  db.prepare('INSERT INTO audit_logs (id, user_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)')
    .run(crypto.randomUUID(), req.user.id, 'delete_vpn_tunnel', `Deleted VPN tunnel ID: ${req.params.id}`, req.clientIp);
  res.json({ success: true });
});

export default router;
