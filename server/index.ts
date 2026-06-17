import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { ipCapture } from './middleware/ipCapture.js';
import authRouter from './routes/auth.js';
import routersRouter from './routes/routers.js';
import groupsRouter from './routes/groups.js';
import usersRouter from './routes/users.js';
import vyosRouter from './routes/vyos.js';
import dataRouter from './routes/data.js';
import logsRouter from './routes/logs.js';
import settingsRouter from './routes/settings.js';
import systemRouter from './routes/system.js';

export async function createApp() {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      'FATAL: JWT_SECRET environment variable is required. Set it to a long random string (e.g., openssl rand -hex 32).'
    );
  }

  if (!process.env.ENCRYPTION_KEY) {
    throw new Error(
      'FATAL: ENCRYPTION_KEY environment variable is required (must be exactly 64 hex characters, e.g., openssl rand -hex 32).'
    );
  }
  if (!/^[0-9a-f]{64}$/i.test(process.env.ENCRYPTION_KEY)) {
    throw new Error(
      'FATAL: ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes for AES-256-GCM).'
    );
  }

  if (process.env.ALLOW_SELF_SIGNED === 'true') {
    const msg = [
      '╔══════════════════════════════════════════════════════════════════╗',
      '║  WARNING: ALLOW_SELF_SIGNED=true — TLS verification is DISABLED  ║',
      '║  All VyOS router connections will accept self-signed certificates  ║',
      '║  Do NOT use this setting in production. For production, either:   ║',
      '║    - Add your CA cert via NODE_EXTRA_CA_CERTS env var             ║',
      '║    - Or install the router cert in the system trust store         ║',
      '╚══════════════════════════════════════════════════════════════════╝',
    ].join('\n');
    console.warn(msg);
    if (process.env.NODE_ENV === 'production') {
      console.error('FATAL: ALLOW_SELF_SIGNED=true is not permitted in production (NODE_ENV=production). Remove this flag or set NODE_EXTRA_CA_CERTS to your CA certificate path.');
      process.exit(1);
    }
  }

  const app = express();
  app.use(express.json());
  app.use(ipCapture);

  app.use('/api', authRouter);
  app.use('/api/routers', routersRouter);
  app.use('/api/router-groups', groupsRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/vyos', vyosRouter);
  app.use('/api', dataRouter);
  app.use('/api/logs', logsRouter);
  app.use('/api', settingsRouter);
  app.use('/api/system', systemRouter);

  return app;
}

export async function startServer() {
  let app: import('express').Express;
  try {
    app = await createApp();
  } catch (err: any) {
    console.error(err.message);
    process.exit(1);
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => res.sendFile(path.resolve('dist/index.html')));
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
