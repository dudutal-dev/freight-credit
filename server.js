/**
 * Freight Credit Management System — Backend Server
 * Node.js + Express + SQLite
 * ---------------------------------------------------
 * Serves the React app + provides KV storage API
 */

const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "freight.db");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── Database Setup ──────────────────────────────────
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS kv_store (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS audit_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    action     TEXT,
    key        TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

console.log(`✅ Database ready: ${DB_PATH}`);

// ── Middleware ──────────────────────────────────────
app.use(express.json({ limit: "10mb" }));

// CORS for development
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ── KV Storage API ──────────────────────────────────
// GET /api/kv/:key — retrieve value
app.get("/api/kv/:key", (req, res) => {
  try {
    const row = db.prepare("SELECT value FROM kv_store WHERE key = ?").get(req.params.key);
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ key: req.params.key, value: row.value });
  } catch (e) {
    console.error("GET error:", e);
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/kv/:key — set value
app.put("/api/kv/:key", (req, res) => {
  try {
    const { value } = req.body;
    if (value === undefined) return res.status(400).json({ error: "value required" });
    db.prepare(`
      INSERT INTO kv_store (key, value, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `).run(req.params.key, String(value));
    res.json({ ok: true });
  } catch (e) {
    console.error("PUT error:", e);
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/kv/:key — delete value
app.delete("/api/kv/:key", (req, res) => {
  try {
    db.prepare("DELETE FROM kv_store WHERE key = ?").run(req.params.key);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Admin API (optional) ────────────────────────────
// GET /api/admin/keys — list all keys (for debugging)
app.get("/api/admin/keys", (req, res) => {
  const rows = db.prepare("SELECT key, length(value) as size, updated_at FROM kv_store ORDER BY updated_at DESC").all();
  res.json(rows);
});

// POST /api/admin/backup — backup database as JSON
app.get("/api/admin/backup", (req, res) => {
  const rows = db.prepare("SELECT * FROM kv_store").all();
  res.setHeader("Content-Disposition", `attachment; filename="freight-backup-${new Date().toISOString().slice(0,10)}.json"`);
  res.json({ backup_date: new Date().toISOString(), records: rows });
});

// ── Serve React App ─────────────────────────────────
const FRONTEND_BUILD = path.join(__dirname, "..", "frontend", "dist");
if (fs.existsSync(FRONTEND_BUILD)) {
  app.use(express.static(FRONTEND_BUILD));
  app.get("*", (req, res) => {
    res.sendFile(path.join(FRONTEND_BUILD, "index.html"));
  });
  console.log(`✅ Serving frontend from ${FRONTEND_BUILD}`);
} else {
  app.get("/", (req, res) => res.send("Backend running. Build frontend first: cd frontend && npm run build"));
  console.log("⚠️  Frontend not built yet — run: cd frontend && npm run build");
}

// ── Start ───────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 Freight Credit Server running on port ${PORT}`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://YOUR-SERVER-IP:${PORT}\n`);
});

// Graceful shutdown
process.on("SIGTERM", () => { db.close(); process.exit(0); });
process.on("SIGINT",  () => { db.close(); process.exit(0); });
