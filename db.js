
const Database = require("better-sqlite3");

const db = new Database("pulsecheck.db");

console.log("Database connected");

// Enforce relationships between database tables.
db.pragma("foreign_keys = ON");

// Create the endpoints table.
db.prepare(`
  CREATE TABLE IF NOT EXISTS endpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

console.log("Endpoints table ready");

// Prevent the same URL from being registered twice.
db.prepare(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_endpoints_url
  ON endpoints(url)
`).run();

// Create the checks table.
db.prepare(`
  CREATE TABLE IF NOT EXISTS checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint_id INTEGER NOT NULL,
    status_code INTEGER,
    latency_ms INTEGER,
    success INTEGER NOT NULL,
    checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (endpoint_id) REFERENCES endpoints(id)
  )
`).run();

console.log("Checks table ready");

module.exports = db;
