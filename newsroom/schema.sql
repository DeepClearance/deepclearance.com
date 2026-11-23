CREATE TABLE IF NOT EXISTS editions (
  slug TEXT NOT NULL,
  revision INTEGER NOT NULL,
  published INTEGER NOT NULL CHECK (published IN (0, 1)),
  content TEXT NOT NULL,
  recorded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (slug, revision)
);
CREATE INDEX IF NOT EXISTS published_editions ON editions (published, slug, revision DESC);
