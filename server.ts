import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import path from "path";
import { GoogleGenAI } from "@google/genai";

const JWT_SECRET = process.env.JWT_SECRET || "nexus-gtm-secret-key";
const db = new Database("nexus_gtm.db");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Initialize Database for GTM
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'member', -- admin, manager, member
    team_id TEXT DEFAULT 'default'
  );

  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT,
    last_name TEXT,
    email TEXT UNIQUE,
    company TEXT,
    title TEXT,
    status TEXT DEFAULT 'new', -- new, qualified, engaged, converted, lost
    score INTEGER DEFAULT 0,
    source TEXT,
    owner_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    type TEXT, -- email, social, ads, event
    status TEXT DEFAULT 'active',
    budget REAL,
    spent REAL DEFAULT 0,
    leads_count INTEGER DEFAULT 0,
    start_date DATETIME,
    end_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS deals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    name TEXT,
    value REAL,
    stage TEXT DEFAULT 'discovery', -- discovery, qualification, proposal, negotiation, closed_won, closed_lost
    probability INTEGER DEFAULT 10,
    expected_close DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lead_id) REFERENCES leads(id)
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT,
    entity_type TEXT,
    entity_id INTEGER,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Seed Admin User
const adminExists = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync(process.env.ADMIN_PASSWORD || "admin123", 10);
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", hashedPassword, "admin");
}

// Seed Sample Data
const leadCount = db.prepare("SELECT COUNT(*) as count FROM leads").get() as any;
if (leadCount.count === 0) {
  const insertLead = db.prepare("INSERT INTO leads (first_name, last_name, email, company, title, status, score, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  insertLead.run("Sarah", "Chen", "sarah@techflow.io", "TechFlow", "VP Engineering", "qualified", 85, "LinkedIn");
  insertLead.run("Marcus", "Rodriguez", "m.rod@globalcorp.com", "GlobalCorp", "CTO", "engaged", 92, "Referral");
  insertLead.run("Elena", "Sokolov", "elena@datapeak.ai", "DataPeak", "Head of Growth", "new", 45, "Webinar");

  const insertCampaign = db.prepare("INSERT INTO campaigns (name, type, budget, spent, leads_count) VALUES (?, ?, ?, ?, ?)");
  insertCampaign.run("Q1 Enterprise Outreach", "email", 5000, 1200, 45);
  insertCampaign.run("Cloud Summit 2026", "event", 25000, 18000, 120);

  const insertDeal = db.prepare("INSERT INTO deals (lead_id, name, value, stage, probability) VALUES (?, ?, ?, ?, ?)");
  insertDeal.run(1, "TechFlow Enterprise License", 45000, "proposal", 60);
  insertDeal.run(2, "GlobalCorp Global Rollout", 120000, "negotiation", 80);
}

async function startServer() {
  const app = express();
  app.use(express.json());

  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // Auth
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    if (user && bcrypt.compareSync(password, user.password)) {
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
      res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Leads
  app.get("/api/leads", authenticate, (req, res) => {
    const leads = db.prepare("SELECT * FROM leads ORDER BY created_at DESC").all();
    res.json(leads);
  });

  app.post("/api/leads", authenticate, (req: any, res) => {
    const { first_name, last_name, email, company, title, source } = req.body;
    try {
      const result = db.prepare("INSERT INTO leads (first_name, last_name, email, company, title, source, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(first_name, last_name, email, company, title, source, req.user.id);
      res.json({ id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(400).json({ error: "Lead already exists or invalid data" });
    }
  });

  // Campaigns
  app.get("/api/campaigns", authenticate, (req, res) => {
    const campaigns = db.prepare("SELECT * FROM campaigns ORDER BY created_at DESC").all();
    res.json(campaigns);
  });

  // Deals / Pipeline
  app.get("/api/deals", authenticate, (req, res) => {
    const deals = db.prepare(`
      SELECT d.*, l.first_name, l.last_name, l.company 
      FROM deals d
      JOIN leads l ON d.lead_id = l.id
      ORDER BY d.created_at DESC
    `).all();
    res.json(deals);
  });

  // Dashboard Stats
  app.get("/api/stats", authenticate, (req, res) => {
    const totalPipeline = db.prepare("SELECT SUM(value) as total FROM deals WHERE stage NOT IN ('closed_lost')").get() as any;
    const closedWon = db.prepare("SELECT SUM(value) as total FROM deals WHERE stage = 'closed_won'").get() as any;
    const leadCount = db.prepare("SELECT COUNT(*) as count FROM leads").get() as any;
    const activeCampaigns = db.prepare("SELECT COUNT(*) as count FROM campaigns WHERE status = 'active'").get() as any;

    res.json({
      pipelineValue: totalPipeline.total || 0,
      revenue: closedWon.total || 0,
      totalLeads: leadCount.count,
      activeCampaigns: activeCampaigns.count,
      pipelineByStage: db.prepare("SELECT stage, COUNT(*) as count, SUM(value) as value FROM deals GROUP BY stage").all()
    });
  });

  // AI Analysis Endpoint
  app.post("/api/ai/analyze", authenticate, async (req: any, res) => {
    const { leads, deals } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.json({ 
        analysis: "AI Analysis is currently in preview mode. Please configure your Gemini API key to enable live strategic insights." 
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze this GTM data and provide a concise strategic recommendation (max 100 words). 
        Leads: ${JSON.stringify(leads)}
        Deals: ${JSON.stringify(deals)}`,
        config: {
          systemInstruction: "You are a world-class GTM strategist. Provide actionable, data-driven insights for enterprise sales teams."
        }
      });
      res.json({ analysis: response.text });
    } catch (err: any) {
      res.status(500).json({ error: "AI analysis failed", details: err.message });
    }
  });

  // Vite middleware
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
    console.log(`Nexus GTM Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
