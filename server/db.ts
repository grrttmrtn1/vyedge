import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const DB_PATH = process.env.DB_PATH || 'vyos_manager.db';

const dbDir = path.dirname(DB_PATH);
if (dbDir !== '.' && !fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'operator',
    tenant_id TEXT DEFAULT 'default'
  );

  CREATE TABLE IF NOT EXISTS router_groups (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE,
    tenant_id TEXT DEFAULT 'default'
  );

  CREATE TABLE IF NOT EXISTS routers (
    id TEXT PRIMARY KEY,
    name TEXT,
    url TEXT,
    api_key TEXT,
    group_id TEXT,
    tenant_id TEXT DEFAULT 'default' NOT NULL,
    status TEXT DEFAULT 'unknown',
    last_check DATETIME,
    FOREIGN KEY(group_id) REFERENCES router_groups(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS user_router_groups (
    user_id TEXT,
    group_id TEXT,
    PRIMARY KEY(user_id, group_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(group_id) REFERENCES router_groups(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT,
    target_router_id TEXT,
    details TEXT,
    ip_address TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS routes (
    id TEXT PRIMARY KEY,
    destination TEXT,
    next_hop TEXT,
    interface TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS firewall_rules (
    id TEXT PRIMARY KEY,
    action TEXT,
    protocol TEXT,
    source_address TEXT,
    source_port TEXT,
    destination_address TEXT,
    destination_port TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS vpn_tunnels (
    id TEXT PRIMARY KEY,
    name TEXT,
    remote_peer TEXT,
    local_address TEXT,
    shared_secret TEXT,
    encryption TEXT,
    status TEXT DEFAULT 'down',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    rule_id TEXT NOT NULL,
    router_id TEXT NOT NULL,
    metric TEXT NOT NULL,
    value REAL NOT NULL,
    threshold REAL NOT NULL,
    fired_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS firewall_drafts (
    id TEXT PRIMARY KEY,
    router_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    path TEXT NOT NULL,
    value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const migrate = () => {
  console.log('Starting database migrations...');
  db.pragma('foreign_keys = OFF');

  try {
    const userTableInfo = db.prepare('PRAGMA table_info(users)').all() as any[];
    const idColumn = userTableInfo.find(c => c.name === 'id');
    const userColumns = userTableInfo.map(c => c.name);

    if (idColumn && idColumn.type.toUpperCase() !== 'TEXT') {
      console.log('Migrating users table to TEXT IDs...');
      db.exec(`
        CREATE TABLE users_new (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE,
          password TEXT,
          role TEXT DEFAULT 'operator',
          tenant_id TEXT DEFAULT 'default'
        );
        INSERT INTO users_new (id, username, password, role, tenant_id)
        SELECT CAST(id AS TEXT), username, password, role, COALESCE(tenant_id, 'default') FROM users;
        DROP TABLE users;
        ALTER TABLE users_new RENAME TO users;
      `);
    } else {
      if (!userColumns.includes('tenant_id')) {
        db.exec("ALTER TABLE users ADD COLUMN tenant_id TEXT DEFAULT 'default'");
      }
    }

    const groupTableInfo = db.prepare('PRAGMA table_info(router_groups)').all() as any[];
    const groupIdColumn = groupTableInfo.find(c => c.name === 'id');
    const groupColumns = groupTableInfo.map(c => c.name);

    if (groupIdColumn && groupIdColumn.type.toUpperCase() !== 'TEXT') {
      console.log('Migrating router_groups table to TEXT IDs...');
      db.exec(`
        CREATE TABLE router_groups_new (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE,
          tenant_id TEXT DEFAULT 'default'
        );
        INSERT INTO router_groups_new (id, name, tenant_id)
        SELECT CAST(id AS TEXT), name, COALESCE(tenant_id, 'default') FROM router_groups;
        DROP TABLE router_groups;
        ALTER TABLE router_groups_new RENAME TO router_groups;
      `);
    } else {
      if (!groupColumns.includes('tenant_id')) {
        db.exec("ALTER TABLE router_groups ADD COLUMN tenant_id TEXT DEFAULT 'default'");
      }
    }

    const routerTableInfo = db.prepare('PRAGMA table_info(routers)').all() as any[];
    const routerIdColumn = routerTableInfo.find(c => c.name === 'id');
    const routerColumns = routerTableInfo.map(c => c.name);

    if (routerIdColumn && routerIdColumn.type.toUpperCase() !== 'TEXT') {
      console.log('Migrating routers table to TEXT IDs...');
      db.exec(`
        CREATE TABLE routers_new (
          id TEXT PRIMARY KEY,
          name TEXT,
          url TEXT,
          api_key TEXT,
          group_id TEXT,
          tenant_id TEXT DEFAULT 'default' NOT NULL,
          status TEXT DEFAULT 'unknown',
          last_check DATETIME,
          FOREIGN KEY(group_id) REFERENCES router_groups(id) ON DELETE SET NULL
        );
        INSERT INTO routers_new (id, name, url, api_key, group_id, tenant_id, status, last_check)
        SELECT CAST(id AS TEXT), name, url, api_key, CAST(group_id AS TEXT), COALESCE(tenant_id, 'default'), status, last_check FROM routers;
        DROP TABLE routers;
        ALTER TABLE routers_new RENAME TO routers;
      `);
    } else {
      if (!routerColumns.includes('group_id')) db.exec('ALTER TABLE routers ADD COLUMN group_id TEXT');
      if (!routerColumns.includes('tenant_id')) db.exec("ALTER TABLE routers ADD COLUMN tenant_id TEXT DEFAULT 'default'");
      if (!routerColumns.includes('status')) db.exec("ALTER TABLE routers ADD COLUMN status TEXT DEFAULT 'unknown'");
      if (!routerColumns.includes('last_check')) db.exec('ALTER TABLE routers ADD COLUMN last_check DATETIME');
      if (!routerColumns.includes('vyos_version')) db.exec('ALTER TABLE routers ADD COLUMN vyos_version TEXT');
    }

    const auditTableInfo = db.prepare('PRAGMA table_info(audit_logs)').all() as any[];
    const auditIdColumn = auditTableInfo.find(c => c.name === 'id');
    const auditColumns = auditTableInfo.map(c => c.name);

    if (auditIdColumn && auditIdColumn.type.toUpperCase() !== 'TEXT') {
      console.log('Migrating audit_logs table to TEXT IDs...');
      db.exec(`
        CREATE TABLE audit_logs_new (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          action TEXT,
          target_router_id TEXT,
          details TEXT,
          ip_address TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO audit_logs_new (id, user_id, action, target_router_id, details, ip_address, timestamp)
        SELECT CAST(id AS TEXT), CAST(user_id AS TEXT), action, CAST(target_router_id AS TEXT), details, ip_address, timestamp FROM audit_logs;
        DROP TABLE audit_logs;
        ALTER TABLE audit_logs_new RENAME TO audit_logs;
      `);
    } else {
      if (!auditColumns.includes('target_router_id')) db.exec('ALTER TABLE audit_logs ADD COLUMN target_router_id TEXT');
      if (!auditColumns.includes('details')) db.exec('ALTER TABLE audit_logs ADD COLUMN details TEXT');
      if (!auditColumns.includes('ip_address')) db.exec('ALTER TABLE audit_logs ADD COLUMN ip_address TEXT');
    }

    console.log('Ensuring user_router_groups uses TEXT IDs...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_router_groups_new (
        user_id TEXT,
        group_id TEXT,
        PRIMARY KEY(user_id, group_id),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(group_id) REFERENCES router_groups(id) ON DELETE CASCADE
      );
      INSERT OR IGNORE INTO user_router_groups_new (user_id, group_id)
      SELECT CAST(user_id AS TEXT), CAST(group_id AS TEXT) FROM user_router_groups;
      DROP TABLE IF EXISTS user_router_groups;
      ALTER TABLE user_router_groups_new RENAME TO user_router_groups;
    `);

    console.log('Database migrations completed successfully.');
  } catch (e: any) {
    console.error('Database migration failed:', e.message);
  } finally {
    db.pragma('foreign_keys = ON');
  }
};

migrate();

const seedSettings = [
  ['sso_enabled', 'false'],
  ['sso_provider_url', ''],
  ['sso_client_id', ''],
  ['sso_client_secret', ''],
  ['sso_type', 'saml'],
  ['syslog_enabled', 'false'],
  ['syslog_host', ''],
  ['syslog_port', '514'],
  ['tenancy_enabled', 'true'],
  ['audit_retention', '90'],
  ['encryption_at_rest', 'true'],
  ['session_timeout', '30'],
  ['compliance_mode', 'standard'],
  ['alert_rules', '[]'],
];
const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
seedSettings.forEach(([k, v]) => insertSetting.run(k, v));

const adminExists = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);
  const adminId = crypto.randomUUID();
  db.prepare('INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)').run(adminId, 'admin', hashedPassword, 'admin');
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters long';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Password must contain at least one special character';
  return null;
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext) return ciphertext;
  try {
    const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
    const data = Buffer.from(ciphertext, 'base64');
    const iv = data.subarray(0, 12);
    const tag = data.subarray(12, 28);
    const encrypted = data.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final('utf8');
  } catch {
    return '';
  }
}
