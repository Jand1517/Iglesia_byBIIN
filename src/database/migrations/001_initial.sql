-- 001: esquema original del proyecto.
-- Usa IF NOT EXISTS para que las bases creadas antes del sistema de
-- migraciones la marquen como aplicada sin cambios.

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

-- Almacén genérico en JSON; se reemplaza por tablas reales en 002/003.
CREATE TABLE IF NOT EXISTS records (
  kind TEXT,
  id   TEXT,
  data TEXT,
  PRIMARY KEY (kind, id)
);
