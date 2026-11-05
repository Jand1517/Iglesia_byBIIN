PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
  id    TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name  TEXT,
  role  TEXT,
  hash  TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  token   TEXT PRIMARY KEY,
  user_id TEXT,
  expires INTEGER
);

CREATE TABLE IF NOT EXISTS resets (
  token   TEXT PRIMARY KEY,
  user_id TEXT,
  expires INTEGER
);

-- Almacén genérico de los módulos (miembros, eventos, etc.) en JSON.
CREATE TABLE IF NOT EXISTS records (
  kind TEXT,
  id   TEXT,
  data TEXT,
  PRIMARY KEY (kind, id)
);
