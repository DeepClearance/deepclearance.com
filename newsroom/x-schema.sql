CREATE TABLE IF NOT EXISTS x_distribution (
  slug TEXT PRIMARY KEY,
  revision INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sending','posted','failed','uncertain')),
  post_id TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS x_one_active_send ON x_distribution ((1)) WHERE status = 'sending';
CREATE TABLE IF NOT EXISTS x_connection (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  refresh_token TEXT NOT NULL
);
