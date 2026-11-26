-- Apply after schema.sql and x-schema.sql. Idempotent; creates tables only.
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('feed','x')),
  url TEXT NOT NULL,
  url_hash TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  published_at TEXT,
  seen_at TEXT NOT NULL,
  via TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','drafted','blocked','skipped','failed')),
  reason TEXT
);
CREATE INDEX IF NOT EXISTS leads_by_status ON leads (status, id);
CREATE INDEX IF NOT EXISTS leads_by_seen ON leads (seen_at);

-- One row per pipeline draft. Passing drafts are also unpublished editions the editor can open.
CREATE TABLE IF NOT EXISTS pipeline_items (
  slug TEXT PRIMARY KEY,
  lead_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('drafted','blocked','published','published_manual','posted','failed')),
  reasons TEXT,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Approved X posts waiting for a slot under the cadence limits.
CREATE TABLE IF NOT EXISTS scheduled_posts (
  slug TEXT PRIMARY KEY,
  revision INTEGER NOT NULL,
  text TEXT NOT NULL,
  approval_id INTEGER NOT NULL,
  approved_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
