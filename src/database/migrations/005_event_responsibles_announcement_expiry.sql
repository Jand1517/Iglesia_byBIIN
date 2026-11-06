-- 005:
--   RF-04 · Un evento puede tener varios responsables (tabla puente
--           event_responsibles). Se reconstruye `events` para quitar la
--           columna responsible_id; su valor se copia antes a la tabla nueva.
--   RF-07 · Los comunicados tienen vigencia: se muestran desde `date`
--           (publicación) hasta `expires_on` (opcional, inclusive).

---------------------------------------------------------------------------
-- RF-04 · Responsables
---------------------------------------------------------------------------
CREATE TABLE event_responsibles (
  event_id  TEXT NOT NULL REFERENCES events(id)  ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, member_id)
);
CREATE INDEX idx_event_responsibles_member ON event_responsibles(member_id);

INSERT INTO event_responsibles (event_id, member_id)
  SELECT id, responsible_id FROM events WHERE responsible_id IS NOT NULL;

-- Reconstrucción de `events` sin responsible_id (procedimiento oficial de
-- SQLite: crear, copiar, borrar, renombrar). Las llaves foráneas están
-- desactivadas durante las migraciones y se verifican al terminar.
CREATE TABLE events_new (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL CHECK (length(trim(title)) > 0),
  type        TEXT NOT NULL DEFAULT 'sin_clasificar'
              CHECK (type IN ('religioso', 'administrativo', 'sin_clasificar')),
  date        TEXT NOT NULL CHECK (date(date) IS date),
  time        TEXT NOT NULL CHECK (time(time) IS time || ':00'),
  place       TEXT NOT NULL CHECK (length(trim(place)) > 0),
  description TEXT,
  ministry_id TEXT REFERENCES ministries(id) ON DELETE SET NULL,
  cancelled   INTEGER NOT NULL DEFAULT 0 CHECK (cancelled IN (0, 1)),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT INTO events_new
  (id, title, type, date, time, place, description, ministry_id, cancelled, created_at, updated_at)
SELECT
  id, title, type, date, time, place, description, ministry_id, cancelled, created_at, updated_at
FROM events;
DROP TABLE events;
ALTER TABLE events_new RENAME TO events;
CREATE INDEX idx_events_date     ON events(date);
CREATE INDEX idx_events_ministry ON events(ministry_id);
CREATE INDEX idx_events_type     ON events(type);

---------------------------------------------------------------------------
-- RF-07 · Vigencia de comunicados
---------------------------------------------------------------------------
ALTER TABLE announcements ADD COLUMN expires_on TEXT
  CHECK (expires_on IS NULL OR (date(expires_on) IS expires_on AND expires_on >= date));
