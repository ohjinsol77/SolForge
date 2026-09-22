CREATE TABLE events (id TEXT PRIMARY KEY, time INTEGER NOT NULL, day TEXT NOT NULL, visitor TEXT NOT NULL, site TEXT NOT NULL, path TEXT NOT NULL, kind TEXT NOT NULL, target TEXT NOT NULL DEFAULT '', referrer TEXT NOT NULL DEFAULT '', campaign TEXT NOT NULL DEFAULT '', keyword TEXT NOT NULL DEFAULT '');
CREATE INDEX events_time ON events(time);
CREATE INDEX events_site_day ON events(site,day);
CREATE TABLE sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL, version TEXT NOT NULL);
CREATE TABLE login_attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
