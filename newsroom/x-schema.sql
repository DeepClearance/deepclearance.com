-- Apply after schema.sql. Idempotent; creates tables only.
CREATE TABLE IF NOT EXISTS x_distribution (
  slug TEXT PRIMARY KEY,
  revision INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sending','posted','failed','uncertain')),
  post_id TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS x_one_active_send ON x_distribution ((1)) WHERE status = 'sending';

-- The rotating X refresh token, sealed with AES-256-GCM under the Worker secret X_TOKEN_KEY.
-- D1 and its SQL exports never hold the token in plain text.
CREATE TABLE IF NOT EXISTS x_token (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  iv TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Append-only approval ledger (site publishes and X decisions).
CREATE TABLE IF NOT EXISTS approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('site_publish','x_post')),
  slug TEXT NOT NULL,
  revision INTEGER NOT NULL,
  text TEXT NOT NULL,
  text_sha256 TEXT NOT NULL,
  drafted_text_sha256 TEXT,
  image_key TEXT,
  actor TEXT NOT NULL,
  actor_method TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved','rejected','auto')),
  mode TEXT NOT NULL CHECK (mode IN ('queue','auto')),
  decided_at TEXT NOT NULL,
  note TEXT,
  outcome TEXT,
  post_id TEXT
);
CREATE INDEX IF NOT EXISTS approvals_by_slug ON approvals (slug, revision);
CREATE TRIGGER IF NOT EXISTS approvals_no_delete BEFORE DELETE ON approvals
BEGIN SELECT RAISE(ABORT, 'The approval ledger is append-only.'); END;

-- Failed sign-in attempts per IP per 10-minute bucket.
CREATE TABLE IF NOT EXISTS auth_failures (
  ip TEXT NOT NULL,
  bucket INTEGER NOT NULL,
  failures INTEGER NOT NULL,
  PRIMARY KEY (ip, bucket)
);
