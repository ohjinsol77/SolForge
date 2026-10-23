CREATE TABLE arena_leaderboard_active (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  snapshot_id TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE arena_leaderboard_pages (
  snapshot_id TEXT NOT NULL,
  config TEXT NOT NULL,
  page INTEGER NOT NULL,
  payload TEXT NOT NULL,
  PRIMARY KEY (snapshot_id, config, page)
);

CREATE INDEX arena_leaderboard_pages_lookup
  ON arena_leaderboard_pages (snapshot_id, config, page);
