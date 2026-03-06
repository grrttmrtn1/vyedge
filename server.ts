import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import axios from "axios";
import path from "path";

const JWT_SECRET = process.env.JWT_SECRET || "vyos-enterprise-secret-key";
const db = new Database("vyos_manager.db");
db.pragma('foreign_keys = ON');

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'operator', -- admin, operator, read-only
    tenant_id TEXT DEFAULT 'default'
  );

  CREATE TABLE IF NOT EXISTS router_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    tenant_id TEXT DEFAULT 'default'
  );

  CREATE TABLE IF NOT EXISTS routers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    url TEXT,
    api_key TEXT,
    group_id INTEGER,
    tenant_id TEXT DEFAULT 'default' NOT NULL,
    status TEXT DEFAULT 'unknown',
    last_check DATETIME,
    FOREIGN KEY(group_id) REFERENCES router_groups(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS user_router_groups (
    user_id INTEGER,
    group_id INTEGER,
    PRIMARY KEY(user_id, group_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(group_id) REFERENCES router_groups(id) ON DELETE CASCADE
  );

  -- Ensure user_router_groups has CASCADE if it already existed
  -- We'll do this by recreating it if needed in the migration section

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT,
    target_router_id INTEGER,
    details TEXT,
    ip_address TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Database Migrations
const migrate = () => {
  console.log("Starting database migrations...");
  db.pragma('foreign_keys = OFF');
  
  try {
    const tables = db.prepare("PRAGMA table_info(routers)").all() as any[];
    const columns = tables.map(c => c.name);

    if (!columns.includes('group_id')) {
      db.exec("ALTER TABLE routers ADD COLUMN group_id INTEGER");
    }
    if (!columns.includes('tenant_id')) {
      db.exec("ALTER TABLE routers ADD COLUMN tenant_id TEXT DEFAULT 'default'");
    }
    if (!columns.includes('status')) {
      db.exec("ALTER TABLE routers ADD COLUMN status TEXT DEFAULT 'unknown'");
    }
    if (!columns.includes('last_check')) {
      db.exec("ALTER TABLE routers ADD COLUMN last_check DATETIME");
    }

    const userColumns = (db.prepare("PRAGMA table_info(users)").all() as any[]).map(c => c.name);
    if (!userColumns.includes('tenant_id')) {
      db.exec("ALTER TABLE users ADD COLUMN tenant_id TEXT DEFAULT 'default'");
    }

    const auditColumns = (db.prepare("PRAGMA table_info(audit_logs)").all() as any[]).map(c => c.name);
    if (!auditColumns.includes('target_router_id')) {
      db.exec("ALTER TABLE audit_logs ADD COLUMN target_router_id INTEGER");
    }
    if (!auditColumns.includes('details')) {
      db.exec("ALTER TABLE audit_logs ADD COLUMN details TEXT");
    }
    if (!auditColumns.includes('ip_address')) {
      db.exec("ALTER TABLE audit_logs ADD COLUMN ip_address TEXT");
    }

    // Recreate user_router_groups to ensure CASCADE
    const urgInfo = db.prepare("PRAGMA table_info(user_router_groups)").all();
    if (urgInfo.length > 0) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS user_router_groups_new (
          user_id INTEGER,
          group_id INTEGER,
          PRIMARY KEY(user_id, group_id),
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY(group_id) REFERENCES router_groups(id) ON DELETE CASCADE
        );
        INSERT OR IGNORE INTO user_router_groups_new SELECT * FROM user_router_groups;
        DROP TABLE user_router_groups;
        ALTER TABLE user_router_groups_new RENAME TO user_router_groups;
      `);
    }

    // Recreate routers to ensure ON DELETE SET NULL for group_id
    const rInfo = db.prepare("PRAGMA table_info(routers)").all();
    if (rInfo.length > 0) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS routers_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          url TEXT,
          api_key TEXT,
          group_id INTEGER,
          tenant_id TEXT DEFAULT 'default' NOT NULL,
          status TEXT DEFAULT 'unknown',
          last_check DATETIME,
          FOREIGN KEY(group_id) REFERENCES router_groups(id) ON DELETE SET NULL
        );
        INSERT OR IGNORE INTO routers_new (id, name, url, api_key, group_id, tenant_id, status, last_check) 
        SELECT id, name, url, api_key, group_id, COALESCE(tenant_id, 'default'), status, last_check FROM routers;
        DROP TABLE routers;
        ALTER TABLE routers_new RENAME TO routers;
      `);
    }
    console.log("Database migrations completed successfully.");
  } catch (e: any) {
    console.error("Database migration failed:", e.message);
  } finally {
    db.pragma('foreign_keys = ON');
  }
};

migrate();

// Seed default settings
const seedSettings = [
  ['sso_enabled', 'false'],
  ['sso_provider_url', ''],
  ['sso_client_id', ''],
  ['sso_client_secret', ''],
  ['sso_type', 'saml'], // saml or oidc
  ['syslog_enabled', 'false'],
  ['syslog_host', ''],
  ['syslog_port', '514'],
  ['tenancy_enabled', 'true'],
  ['audit_retention', '90'],
  ['encryption_at_rest', 'true'],
  ['session_timeout', '30'], // minutes
  ['compliance_mode', 'standard'] // standard, hipaa, pci
];
const insertSetting = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
seedSettings.forEach(([k, v]) => insertSetting.run(k, v));

// Seed Admin User if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync(process.env.ADMIN_PASSWORD || "admin123", 10);
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", hashedPassword, "admin");
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Password Validation
  const validatePassword = (password: string) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (password.length < minLength) return "Password must be at least 8 characters long";
    if (!hasUpperCase) return "Password must contain at least one uppercase letter";
    if (!hasLowerCase) return "Password must contain at least one lowercase letter";
    if (!hasNumber) return "Password must contain at least one number";
    if (!hasSpecial) return "Password must contain at least one special character";
    return null;
  };
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    req.clientIp = ip;

    console.log(`[AUTH] ${req.method} ${req.url} from ${ip}`);

    if (!token) {
      console.warn(`[AUTH] No token for ${req.method} ${req.url}`);
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      console.log(`[AUTH] User: ${req.user.username}, Role: ${req.user.role}, Tenant: ${req.user.tenant}`);
      // Ensure tenant is always set to at least 'default'
      if (!req.user.tenant) req.user.tenant = 'default';
      next();
    } catch (err) {
      console.warn(`[AUTH] Invalid token for ${req.method} ${req.url}: ${err}`);
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // RBAC Middleware
  const authorize = (roles: string[]) => (req: any, res: any, next: any) => {
    console.log(`[AUTH] Authorizing ${req.user.username} (Role: ${req.user.role}) for ${req.method} ${req.url}. Required: ${roles}`);
    if (!roles.includes(req.user.role)) {
      console.warn(`[AUTH] Forbidden: ${req.user.username} has role ${req.user.role}, but needs ${roles}`);
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };

  // API Routes
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    if (user && bcrypt.compareSync(password, user.password)) {
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role, tenant: user.tenant_id }, JWT_SECRET);
      res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Router Management
  app.get("/api/routers", authenticate, (req: any, res) => {
    let routers;
    if (req.user.role === 'admin') {
      routers = db.prepare("SELECT id, name, url, status, group_id FROM routers WHERE tenant_id = ?").all(req.user.tenant);
    } else {
      // Limit to groups user has access to
      // Also include routers with no group if the user has a special 'global' assignment (optional, but let's stick to groups for now)
      routers = db.prepare(`
        SELECT r.id, r.name, r.url, r.status, r.group_id 
        FROM routers r
        JOIN user_router_groups urg ON r.group_id = urg.group_id
        WHERE r.tenant_id = ? AND urg.user_id = ?
      `).all(req.user.tenant, req.user.id);
    }
    res.json(routers);
  });

  app.post("/api/routers", authenticate, authorize(["admin"]), (req: any, res) => {
    const { name, url, api_key, group_id } = req.body;
    
    // Basic validation
    if (!url.startsWith('https://')) return res.status(400).json({ error: "URL must start with https://" });
    if (!api_key) return res.status(400).json({ error: "API Key is required" });

    // IP/Hostname validation
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      // Simple IP or hostname check
      if (!hostname) throw new Error("Invalid hostname");
    } catch {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    try {
      const result = db.prepare("INSERT INTO routers (name, url, api_key, group_id, tenant_id) VALUES (?, ?, ?, ?, ?)")
        .run(name, url, api_key, group_id || null, req.user.tenant);
      
      db.prepare("INSERT INTO audit_logs (user_id, action, target_router_id, details, ip_address) VALUES (?, ?, ?, ?, ?)")
        .run(req.user.id, 'add_router', result.lastInsertRowid, JSON.stringify({ name, url }), req.clientIp);

      res.json({ id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/routers/:id", authenticate, authorize(["admin"]), (req: any, res) => {
    const { name, url, api_key, group_id } = req.body;
    const routerId = req.params.id;

    try {
      const existing: any = db.prepare("SELECT * FROM routers WHERE id = ? AND tenant_id = ?").get(routerId, req.user.tenant);
      if (!existing) return res.status(404).json({ error: "Router not found" });

      const updates: string[] = [];
      const values: any[] = [];

      if (name) { updates.push("name = ?"); values.push(name); }
      if (url) { updates.push("url = ?"); values.push(url); }
      if (api_key) { updates.push("api_key = ?"); values.push(api_key); }
      if (group_id !== undefined) { updates.push("group_id = ?"); values.push(group_id || null); }

      if (updates.length === 0) return res.json({ success: true });

      values.push(routerId);
      values.push(req.user.tenant);

      db.prepare(`UPDATE routers SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`).run(...values);
      
      db.prepare("INSERT INTO audit_logs (user_id, action, target_router_id, details, ip_address) VALUES (?, ?, ?, ?, ?)")
        .run(req.user.id, 'update_router', routerId, JSON.stringify(req.body), req.clientIp);

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.all("/api/routers/:id", (req: any, res, next) => {
    console.log(`[DEBUG] ${req.method} request to /api/routers/${req.params.id} from ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}`);
    next();
  });

  app.delete("/api/routers/:id", authenticate, authorize(["admin"]), (req: any, res) => {
    const routerId = Number(req.params.id);
    if (isNaN(routerId)) {
      console.error(`[CRITICAL] Invalid router ID received: ${req.params.id}`);
      return res.status(400).json({ error: "Invalid router ID" });
    }
    const tenant = req.user.tenant;
    console.log(`[DELETE] Router request - ID: ${routerId}, User: ${req.user.username}, Tenant: ${tenant}`);
    
    try {
      const router: any = db.prepare("SELECT name, tenant_id FROM routers WHERE id = ?").get(routerId);
      
      if (!router) {
        console.warn(`[DELETE] Router ${routerId} not found in database`);
        return res.status(404).json({ error: "Router not found" });
      }

      // Admins can delete anything, or if tenant matches
      if (req.user.role !== 'admin' && router.tenant_id !== tenant && tenant !== 'default') {
        console.warn(`[DELETE] Router ${routerId} tenant mismatch. Router: ${router.tenant_id}, User: ${tenant}`);
        return res.status(403).json({ error: "Access denied to this router" });
      }

      const info = db.prepare("DELETE FROM routers WHERE id = ?").run(routerId);
      console.log(`[DELETE] Router ${routerId} - Rows affected: ${info.changes}`);
      
      // Verify deletion
      const check = db.prepare("SELECT id FROM routers WHERE id = ?").get(routerId);
      if (check) {
        console.error(`[CRITICAL] VERIFICATION FAILED: Router ${routerId} still exists after DELETE command!`);
      } else {
        console.log(`[CRITICAL] VERIFICATION PASSED: Router ${routerId} is gone from DB`);
      }

      if (info.changes > 0) {
        db.prepare("INSERT INTO audit_logs (user_id, action, target_router_id, details, ip_address) VALUES (?, ?, ?, ?, ?)")
          .run(req.user.id, 'delete_router', routerId, JSON.stringify({ name: router.name }), req.clientIp);
        res.json({ success: true });
      } else {
        res.status(500).json({ error: "Failed to delete router record" });
      }
    } catch (err: any) {
      console.error(`[DELETE] Router ${routerId} failed:`, err.message);
      res.status(500).json({ error: "Failed to delete router: " + err.message });
    }
  });

  // Router Groups
  app.get("/api/router-groups", authenticate, (req: any, res) => {
    let groups;
    const username = req.user.username;
    const role = req.user.role;
    const tenant = req.user.tenant;

    console.log(`[SERVER] GET /api/router-groups requested by ${username} (Role: ${role}, Tenant: ${tenant})`);

    if (role === 'admin') {
      groups = db.prepare(`
        SELECT rg.*, (SELECT COUNT(*) FROM routers r WHERE r.group_id = rg.id) as node_count
        FROM router_groups rg
      `).all();
    } else {
      groups = db.prepare(`
        SELECT rg.*, (SELECT COUNT(*) FROM routers r WHERE r.group_id = rg.id) as node_count
        FROM router_groups rg
        WHERE rg.tenant_id = ?
      `).all(tenant);
    }
    console.log(`[SERVER] Returning ${groups.length} groups: ${JSON.stringify(groups.map((g: any) => ({id: g.id, name: g.name})))}`);
    res.json(groups);
  });

  app.all("/api/router-groups/:id", (req: any, res, next) => {
    console.log(`[DEBUG] ${req.method} request to /api/router-groups/${req.params.id} from ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}`);
    next();
  });

  app.delete("/api/router-groups/:id", authenticate, authorize(["admin"]), (req: any, res) => {
    const groupId = Number(req.params.id);
    if (isNaN(groupId)) {
      console.error(`[CRITICAL] Invalid group ID received: ${req.params.id}`);
      return res.status(400).json({ error: "Invalid group ID" });
    }
    const username = req.user.username;
    
    console.log(`[CRITICAL] DELETE /api/router-groups/${groupId} initiated by ${username}`);
    
    try {
      // 1. Verify group exists
      const group: any = db.prepare("SELECT * FROM router_groups WHERE id = ?").get(groupId);
      if (!group) {
        console.error(`[CRITICAL] Group ${groupId} NOT FOUND in database before deletion`);
        const allGroups = db.prepare("SELECT id, name FROM router_groups").all();
        console.log(`[CRITICAL] Current groups in DB: ${JSON.stringify(allGroups)}`);
        return res.status(404).json({ error: "Group not found" });
      }
      console.log(`[CRITICAL] Group found: ${JSON.stringify(group)}`);

      // 2. Perform deletion steps manually
      db.prepare("UPDATE routers SET group_id = NULL WHERE group_id = ?").run(groupId);
      db.prepare("DELETE FROM user_router_groups WHERE group_id = ?").run(groupId);
      const info = db.prepare("DELETE FROM router_groups WHERE id = ?").run(groupId);
      
      console.log(`[CRITICAL] Group records deleted: ${info.changes}`);

      // 3. Verify deletion
      const check = db.prepare("SELECT * FROM router_groups WHERE id = ?").get(groupId);
      if (check) {
        console.error(`[CRITICAL] VERIFICATION FAILED: Group ${groupId} still exists after DELETE command!`);
      } else {
        console.log(`[CRITICAL] VERIFICATION PASSED: Group ${groupId} is gone from DB`);
      }

      const remaining = db.prepare("SELECT COUNT(*) as count FROM router_groups").get() as any;
      console.log(`[CRITICAL] Remaining groups in DB: ${remaining.count}`);

      if (info.changes > 0) {
        db.prepare("INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)")
          .run(req.user.id, 'delete_group', `Deleted router group: ${group.name} (ID: ${groupId})`, req.clientIp);
        res.json({ success: true, remaining: remaining.count });
      } else {
        res.status(500).json({ error: "Failed to delete group record" });
      }
    } catch (err: any) {
      console.error("[CRITICAL] UNEXPECTED ERROR during group deletion:", err);
      res.status(500).json({ error: "Internal server error: " + err.message });
    }
  });

  app.post("/api/router-groups", authenticate, authorize(["admin"]), (req: any, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Group name is required" });
    try {
      const result = db.prepare("INSERT INTO router_groups (name, tenant_id) VALUES (?, ?)").run(name, req.user.tenant);
      res.json({ id: result.lastInsertRowid });
    } catch {
      res.status(400).json({ error: "Group already exists" });
    }
  });


  // User Management
  app.get("/api/users", authenticate, authorize(["admin"]), (req, res) => {
    const users = db.prepare("SELECT id, username, role, tenant_id FROM users").all();
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

  app.post("/api/users", authenticate, authorize(["admin"]), (req, res) => {
    const { username, password, role } = req.body;
    
    const passwordError = validatePassword(password);
    if (passwordError) return res.status(400).json({ error: passwordError });

    const hashedPassword = bcrypt.hashSync(password, 10);
    try {
      const result = db.prepare("INSERT INTO users (username, password, role, tenant_id) VALUES (?, ?, ?, ?)").run(username, hashedPassword, role, (req as any).user.tenant);
      res.json({ id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(400).json({ error: "Username already exists" });
    }
  });

  app.patch("/api/users/:id/password", authenticate, authorize(["admin"]), (req: any, res) => {
    const { password } = req.body;
    const passwordError = validatePassword(password);
    if (passwordError) return res.status(400).json({ error: passwordError });

    const hashedPassword = bcrypt.hashSync(password, 10);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/users/:id", authenticate, authorize(["admin"]), (req: any, res) => {
    if (req.params.id == req.user.id) return res.status(400).json({ error: "Cannot delete yourself" });
    db.prepare("DELETE FROM user_router_groups WHERE user_id = ?").run(req.params.id);
    db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/users/:id/groups", authenticate, authorize(["admin"]), (req: any, res) => {
    const groups = db.prepare("SELECT group_id FROM user_router_groups WHERE user_id = ?").all(req.params.id);
    res.json(groups.map((g: any) => g.group_id));
  });

  app.put("/api/users/:id/groups", authenticate, authorize(["admin"]), (req: any, res) => {
    const { groupIds } = req.body;
    const userId = req.params.id;
    
    const tx = db.transaction(() => {
      db.prepare("DELETE FROM user_router_groups WHERE user_id = ?").run(userId);
      const insert = db.prepare("INSERT INTO user_router_groups (user_id, group_id) VALUES (?, ?)");
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

  // System Actions
  app.post("/api/system/backup", authenticate, authorize(["admin"]), (req: any, res) => {
    try {
      // In a real app, this would trigger a database dump or file backup
      db.prepare("INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)")
        .run(req.user.id, 'system_backup', 'Manual system backup triggered', req.clientIp);
      
      res.json({ success: true, message: "Backup created successfully", timestamp: new Date().toISOString() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/system/restore", authenticate, authorize(["admin"]), (req: any, res) => {
    try {
      db.prepare("INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)")
        .run(req.user.id, 'system_restore', 'System restoration initiated', req.clientIp);
      
      res.json({ success: true, message: "System restoration initiated. Services will be unavailable briefly." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/system/restart", authenticate, authorize(["admin"]), (req: any, res) => {
    try {
      db.prepare("INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)")
        .run(req.user.id, 'system_restart', 'System services restart triggered', req.clientIp);
      
      res.json({ success: true, message: "Services are restarting. This may take a few moments." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // VyOS API Proxy
  app.post("/api/vyos/:routerId/:action", authenticate, authorize(["admin", "operator"]), async (req: any, res) => {
    const { routerId, action } = req.params;
    const { data } = req.body;

    // Check if user has access to this router
    const router: any = db.prepare(`
      SELECT r.* 
      FROM routers r
      LEFT JOIN user_router_groups urg ON r.group_id = urg.group_id
      WHERE r.id = ? AND r.tenant_id = ? AND (urg.user_id = ? OR ? = 'admin')
    `).get(routerId, req.user.tenant, req.user.id, req.user.role);

    if (!router) return res.status(404).json({ error: "Router not found or access denied" });

    try {
      const formData = new URLSearchParams();
      formData.append("key", router.api_key);
      
      let vyosEndpoint = action;
      if (action === 'show') vyosEndpoint = 'retrieve';
      if (action === 'op') vyosEndpoint = 'op';
      if (action === 'configure') vyosEndpoint = 'configure';
      
      formData.append("data", JSON.stringify(data));

      const response = await axios.post(`${router.url}/${vyosEndpoint}`, formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 15000,
      });

      db.prepare("INSERT INTO audit_logs (user_id, action, target_router_id, details, ip_address) VALUES (?, ?, ?, ?, ?)")
        .run(req.user.id, `vyos_${action}`, routerId, JSON.stringify(data), req.clientIp);

      res.json(response.data);
    } catch (err: any) {
      console.error("VyOS API Error:", err.message);
      res.status(500).json({ 
        error: "Failed to communicate with VyOS", 
        details: err.message
      });
    }
  });

  // System Info
  app.get("/api/system-info", authenticate, (req, res) => {
    res.json({
      uptime: process.uptime(),
      version: "v2.5.0-enterprise",
      node_version: process.version,
      memory: process.memoryUsage(),
      platform: process.platform,
      arch: process.arch
    });
  });

  // Settings
  app.get("/api/settings", authenticate, (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const settingsObj = settings.reduce((acc: any, s: any) => {
      acc[s.key] = s.value === 'true' ? true : s.value === 'false' ? false : s.value;
      return acc;
    }, {});
    res.json(settingsObj);
  });

  app.post("/api/settings", authenticate, authorize(["admin"]), (req, res) => {
    const { key, value } = req.body;
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, String(value));
    res.json({ success: true });
  });

  // Status Check
  app.post("/api/routers/:id/check", authenticate, async (req: any, res) => {
    const router: any = db.prepare("SELECT * FROM routers WHERE id = ? AND tenant_id = ?").get(req.params.id, req.user.tenant);
    if (!router) return res.status(404).json({ error: "Router not found" });

    try {
      const formData = new URLSearchParams();
      formData.append("key", router.api_key);
      formData.append("data", JSON.stringify({ op: "showConfig", path: [] }));

      await axios.post(`${router.url}/retrieve`, formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 5000,
      });

      db.prepare("UPDATE routers SET status = 'online', last_check = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
      res.json({ status: 'online' });
    } catch (err) {
      db.prepare("UPDATE routers SET status = 'offline', last_check = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
      res.json({ status: 'offline' });
    }
  });

  // Audit Logs
  app.get("/api/logs", authenticate, authorize(["admin", "operator"]), (req: any, res) => {
    const { user, action, router, start, end } = req.query;
    
    let query = `
      SELECT audit_logs.*, users.username, routers.name as router_name 
      FROM audit_logs 
      JOIN users ON audit_logs.user_id = users.id 
      LEFT JOIN routers ON audit_logs.target_router_id = routers.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (user) {
      query += " AND users.username LIKE ?";
      params.push(`%${user}%`);
    }
    if (action) {
      query += " AND audit_logs.action LIKE ?";
      params.push(`%${action}%`);
    }
    if (router) {
      query += " AND (routers.name LIKE ? OR audit_logs.details LIKE ?)";
      params.push(`%${router}%`, `%${router}%`);
    }
    if (start) {
      query += " AND audit_logs.timestamp >= ?";
      params.push(start);
    }
    if (end) {
      query += " AND audit_logs.timestamp <= ?";
      params.push(end);
    }

    query += " ORDER BY timestamp DESC LIMIT 500";
    
    const logs = db.prepare(query).all(...params);
    res.json(logs);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => res.sendFile(path.resolve("dist/index.html")));
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
