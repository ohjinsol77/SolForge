CREATE TABLE menu_visibility (
  menu_key TEXT PRIMARY KEY,
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'hidden', 'admin')),
  updated_at INTEGER NOT NULL
);
