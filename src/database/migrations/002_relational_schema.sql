-- 002: esquema relacional.
--
-- Convenciones:
--   * Fechas:   TEXT 'AAAA-MM-DD'  → CHECK (date(col) IS col) rechaza '2026-02-30' o 'ayer'.
--   * Horas:    TEXT 'HH:MM'       → CHECK (time(col) IS col || ':00').
--   * Booleanos: INTEGER 0/1.
--   * Dinero:   INTEGER en centavos (amount_cents), nunca decimales.
--   * created_at / updated_at en UTC ISO-8601.
--   * Referencias opcionales → ON DELETE SET NULL; tablas puente → ON DELETE CASCADE.

---------------------------------------------------------------------------
-- RF-01 · Usuarios del sistema (se reconstruye para agregar reglas)
---------------------------------------------------------------------------
CREATE TABLE users_new (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE COLLATE NOCASE
             CHECK (email LIKE '%_@_%._%'),
  name       TEXT NOT NULL CHECK (length(trim(name)) > 0),
  role       TEXT NOT NULL
             CHECK (role IN ('administrador','pastor','secretario','tesorero','coordinador')),
  hash       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT INTO users_new (id, email, name, role, hash)
  SELECT id, lower(email), name, role, hash FROM users;
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

CREATE TABLE sessions_new (
  token   TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires INTEGER NOT NULL
);
INSERT INTO sessions_new SELECT token, user_id, expires FROM sessions
  WHERE user_id IN (SELECT id FROM users);
DROP TABLE sessions;
ALTER TABLE sessions_new RENAME TO sessions;
CREATE INDEX idx_sessions_user    ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires);

CREATE TABLE resets_new (
  token   TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires INTEGER NOT NULL
);
INSERT INTO resets_new SELECT token, user_id, expires FROM resets
  WHERE user_id IN (SELECT id FROM users);
DROP TABLE resets;
ALTER TABLE resets_new RENAME TO resets;
CREATE INDEX idx_resets_user ON resets(user_id);

---------------------------------------------------------------------------
-- RF-02 · Miembros
---------------------------------------------------------------------------
CREATE TABLE members (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL CHECK (length(trim(name)) > 0),
  phone      TEXT,
  email      TEXT CHECK (email IS NULL OR email LIKE '%_@_%._%'),
  joined     TEXT NOT NULL CHECK (date(joined) IS joined),
  active     INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_members_active ON members(active);
CREATE INDEX idx_members_name   ON members(name COLLATE NOCASE);
CREATE INDEX idx_members_joined ON members(joined);

---------------------------------------------------------------------------
-- RF-05 · Ministerios e integrantes
---------------------------------------------------------------------------
CREATE TABLE ministries (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL CHECK (length(trim(name)) > 0),
  coordinator_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_ministries_coordinator ON ministries(coordinator_id);

CREATE TABLE ministry_members (
  ministry_id TEXT NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  member_id   TEXT NOT NULL REFERENCES members(id)    ON DELETE CASCADE,
  PRIMARY KEY (ministry_id, member_id)
);
CREATE INDEX idx_ministry_members_member ON ministry_members(member_id);

---------------------------------------------------------------------------
-- RF-04 · Eventos
---------------------------------------------------------------------------
CREATE TABLE events (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL CHECK (length(trim(title)) > 0),
  date           TEXT NOT NULL CHECK (date(date) IS date),
  time           TEXT NOT NULL CHECK (time(time) IS time || ':00'),
  place          TEXT NOT NULL CHECK (length(trim(place)) > 0),
  description    TEXT,
  responsible_id TEXT REFERENCES members(id)    ON DELETE SET NULL,
  ministry_id    TEXT REFERENCES ministries(id) ON DELETE SET NULL,
  cancelled      INTEGER NOT NULL DEFAULT 0 CHECK (cancelled IN (0, 1)),
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_events_date        ON events(date);
CREATE INDEX idx_events_ministry    ON events(ministry_id);
CREATE INDEX idx_events_responsible ON events(responsible_id);

---------------------------------------------------------------------------
-- RF-03 · Asistencia
-- attendance_members guarda el padrón del día: una fila por miembro
-- convocado, con present = 1 (presente) o 0 (ausente).
---------------------------------------------------------------------------
CREATE TABLE attendance (
  id         TEXT PRIMARY KEY,
  event_id   TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  date       TEXT NOT NULL CHECK (date(date) IS date),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (event_id, date)
);
CREATE INDEX idx_attendance_date ON attendance(date);

CREATE TABLE attendance_members (
  attendance_id TEXT NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
  member_id     TEXT NOT NULL REFERENCES members(id)    ON DELETE CASCADE,
  present       INTEGER NOT NULL DEFAULT 0 CHECK (present IN (0, 1)),
  PRIMARY KEY (attendance_id, member_id)
);
CREATE INDEX idx_attendance_members_member ON attendance_members(member_id);

---------------------------------------------------------------------------
-- RF-06 · Aportaciones (member_id NULL = anónima)
---------------------------------------------------------------------------
CREATE TABLE donations (
  id           TEXT PRIMARY KEY,
  date         TEXT NOT NULL CHECK (date(date) IS date),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  concept      TEXT NOT NULL CHECK (length(trim(concept)) > 0),
  method       TEXT NOT NULL
               CHECK (method IN ('Efectivo','Transferencia','Tarjeta','Otro')),
  member_id    TEXT REFERENCES members(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_donations_date   ON donations(date);
CREATE INDEX idx_donations_member ON donations(member_id);

---------------------------------------------------------------------------
-- RF-07 · Comunicados
---------------------------------------------------------------------------
CREATE TABLE announcements (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL CHECK (length(trim(title)) > 0),
  body       TEXT NOT NULL CHECK (length(trim(body)) > 0),
  date       TEXT NOT NULL CHECK (date(date) IS date),
  important  INTEGER NOT NULL DEFAULT 0 CHECK (important IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_announcements_date ON announcements(date);

---------------------------------------------------------------------------
-- RF-10 · Datos de la iglesia: una sola fila (id = 1)
-- El logo es un data URL de imagen; ~700 000 caracteres ≈ 500 KB.
---------------------------------------------------------------------------
CREATE TABLE church_settings (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  name       TEXT NOT NULL CHECK (length(trim(name)) > 0),
  address    TEXT,
  phone      TEXT,
  email      TEXT CHECK (email IS NULL OR email LIKE '%_@_%._%'),
  schedule   TEXT,
  logo       TEXT CHECK (
               logo IS NULL OR (
                 (logo LIKE 'data:image/png;base64,%'
                   OR logo LIKE 'data:image/jpeg;base64,%'
                   OR logo LIKE 'data:image/webp;base64,%')
                 AND length(logo) <= 700000)),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT INTO church_settings (id, name) VALUES (1, 'Mi iglesia');
