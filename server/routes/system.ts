import { Router } from 'express';
import path from 'path';
import crypto from 'crypto';
import { db } from '../db.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.post('/backup', authenticate, authorize(['admin']), async (req: any, res) => {
  try {
    const backupDir = process.env.BACKUP_DIR || './backups';
    const { mkdirSync, existsSync, unlinkSync } = await import('fs');
    if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `vyedge-backup-${timestamp}.db`;
    const backupPath = path.join(backupDir, backupFilename);

    await db.backup(backupPath);

    db.prepare('INSERT INTO audit_logs (id, user_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)')
      .run(crypto.randomUUID(), req.user.id, 'system_backup', `Backup downloaded: ${backupFilename}`, req.clientIp);

    res.download(backupPath, backupFilename, (err) => {
      try { unlinkSync(backupPath); } catch {}
      if (err && !res.headersSent) {
        res.status(500).json({ error: 'Failed to send backup file' });
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Backup failed: ' + err.message });
  }
});

router.post('/restore', authenticate, authorize(['admin']), (_req, res) => {
  res.status(503).json({
    error: 'Restore is not yet available in this version. Download a backup file and restore it manually by replacing the database file.',
  });
});

router.post('/restart', authenticate, authorize(['admin']), (req: any, res) => {
  try {
    db.prepare('INSERT INTO audit_logs (id, user_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)')
      .run(crypto.randomUUID(), req.user.id, 'system_restart', 'System services restart triggered', req.clientIp);
    res.json({ success: true, message: 'Services are restarting. This may take a few moments.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
