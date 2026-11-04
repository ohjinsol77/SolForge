CREATE TABLE game_sessions (
 id TEXT PRIMARY KEY, player TEXT NOT NULL, game TEXT NOT NULL,
 started INTEGER NOT NULL, submitted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX game_sessions_player ON game_sessions(player, started);
CREATE TABLE game_results (
 id TEXT PRIMARY KEY, player TEXT NOT NULL, game TEXT NOT NULL,
 nickname TEXT NOT NULL, score REAL NOT NULL, details TEXT NOT NULL,
 created INTEGER NOT NULL, rules TEXT NOT NULL DEFAULT 'v1'
);
CREATE INDEX game_results_ranking ON game_results(game, rules, created, score);
