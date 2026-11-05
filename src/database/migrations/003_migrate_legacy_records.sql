-- 003: copia los datos de la tabla genérica `records` (JSON) a las tablas
-- relacionales de 002.
--
-- Política de limpieza:
--   * Campos opcionales inválidos (correo mal escrito, referencia a un miembro
--     inexistente, etc.) se guardan como NULL y el registro sí se migra.
--   * Registros cuyos campos OBLIGATORIOS no cumplen las reglas se omiten
--     (INSERT OR IGNORE) y quedan en `legacy_records` para revisarlos a mano.
--   * Al final, `records` se renombra a `legacy_records` conteniendo SOLO lo que
--     no se pudo migrar. En una instalación nueva queda vacía.

-- Miembros ---------------------------------------------------------------
INSERT OR IGNORE INTO members (id, name, phone, email, joined, active)
SELECT
  r.id,
  trim(json_extract(r.data, '$.name')),
  NULLIF(trim(json_extract(r.data, '$.phone')), ''),
  CASE WHEN json_extract(r.data, '$.email') LIKE '%_@_%._%'
       THEN trim(json_extract(r.data, '$.email')) END,
  json_extract(r.data, '$.joined'),
  CASE WHEN json_extract(r.data, '$.active') IN (0, 'false') THEN 0 ELSE 1 END
FROM records r
WHERE r.kind = 'members';

-- Ministerios e integrantes ----------------------------------------------
INSERT OR IGNORE INTO ministries (id, name, coordinator_id)
SELECT
  r.id,
  trim(json_extract(r.data, '$.name')),
  (SELECT m.id FROM members m WHERE m.id = json_extract(r.data, '$.coordinator'))
FROM records r
WHERE r.kind = 'ministries';

INSERT OR IGNORE INTO ministry_members (ministry_id, member_id)
SELECT r.id, je.value
FROM records r, json_each(r.data, '$.members') je
WHERE r.kind = 'ministries'
  AND r.id     IN (SELECT id FROM ministries)
  AND je.value IN (SELECT id FROM members);

-- Eventos ----------------------------------------------------------------
INSERT OR IGNORE INTO events
  (id, title, date, time, place, description, responsible_id, ministry_id, cancelled)
SELECT
  r.id,
  trim(json_extract(r.data, '$.title')),
  json_extract(r.data, '$.date'),
  json_extract(r.data, '$.time'),
  trim(json_extract(r.data, '$.place')),
  NULLIF(trim(json_extract(r.data, '$.description')), ''),
  (SELECT m.id FROM members m    WHERE m.id = json_extract(r.data, '$.responsible')),
  (SELECT x.id FROM ministries x WHERE x.id = json_extract(r.data, '$.ministry')),
  CASE WHEN json_extract(r.data, '$.cancelled') IN (1, 'true') THEN 1 ELSE 0 END
FROM records r
WHERE r.kind = 'events';

-- Asistencia: padrón (roster) + presentes ---------------------------------
INSERT OR IGNORE INTO attendance (id, event_id, date)
SELECT r.id, json_extract(r.data, '$.event'), json_extract(r.data, '$.date')
FROM records r
WHERE r.kind = 'attendance'
  AND json_extract(r.data, '$.event') IN (SELECT id FROM events);

-- Integrantes del padrón, marcando si estuvieron presentes.
INSERT OR IGNORE INTO attendance_members (attendance_id, member_id, present)
SELECT
  r.id,
  je.value,
  EXISTS (SELECT 1 FROM json_each(r.data, '$.present') p WHERE p.value = je.value)
FROM records r, json_each(r.data, '$.roster') je
WHERE r.kind = 'attendance'
  AND r.id     IN (SELECT id FROM attendance)
  AND je.value IN (SELECT id FROM members);

-- Presentes que no estaban en el padrón (p. ej. miembros inactivos).
INSERT OR IGNORE INTO attendance_members (attendance_id, member_id, present)
SELECT r.id, p.value, 1
FROM records r, json_each(r.data, '$.present') p
WHERE r.kind = 'attendance'
  AND r.id    IN (SELECT id FROM attendance)
  AND p.value IN (SELECT id FROM members);

-- Aportaciones (pesos → centavos) ----------------------------------------
INSERT OR IGNORE INTO donations (id, date, amount_cents, concept, method, member_id)
SELECT
  r.id,
  json_extract(r.data, '$.date'),
  CAST(round(json_extract(r.data, '$.amount') * 100) AS INTEGER),
  trim(json_extract(r.data, '$.concept')),
  CASE WHEN json_extract(r.data, '$.method') IN ('Efectivo','Transferencia','Tarjeta','Otro')
       THEN json_extract(r.data, '$.method') ELSE 'Otro' END,
  (SELECT m.id FROM members m WHERE m.id = json_extract(r.data, '$.member'))
FROM records r
WHERE r.kind = 'donations';

-- Comunicados -------------------------------------------------------------
INSERT OR IGNORE INTO announcements (id, title, body, date, important)
SELECT
  r.id,
  trim(json_extract(r.data, '$.title')),
  trim(json_extract(r.data, '$.body')),
  json_extract(r.data, '$.date'),
  CASE WHEN json_extract(r.data, '$.important') IN (1, 'true') THEN 1 ELSE 0 END
FROM records r
WHERE r.kind = 'announcements';

-- Datos de la iglesia: se toma el registro 'church' (o el primero que haya).
UPDATE church_settings
SET (name, address, phone, email, schedule, logo) = (
  SELECT
    COALESCE(NULLIF(trim(json_extract(s.data, '$.name')), ''), 'Mi iglesia'),
    NULLIF(trim(json_extract(s.data, '$.address')), ''),
    NULLIF(trim(json_extract(s.data, '$.phone')), ''),
    CASE WHEN json_extract(s.data, '$.email') LIKE '%_@_%._%'
         THEN trim(json_extract(s.data, '$.email')) END,
    NULLIF(trim(json_extract(s.data, '$.schedule')), ''),
    CASE WHEN (json_extract(s.data, '$.logo') LIKE 'data:image/png;base64,%'
            OR json_extract(s.data, '$.logo') LIKE 'data:image/jpeg;base64,%'
            OR json_extract(s.data, '$.logo') LIKE 'data:image/webp;base64,%')
          AND length(json_extract(s.data, '$.logo')) <= 700000
         THEN json_extract(s.data, '$.logo') END
  FROM records s
  WHERE s.kind = 'settings'
  ORDER BY s.id = 'church' DESC
  LIMIT 1
)
WHERE id = 1 AND EXISTS (SELECT 1 FROM records WHERE kind = 'settings');

-- Se quitan de `records` los registros ya migrados ------------------------
DELETE FROM records WHERE kind = 'members'       AND id IN (SELECT id FROM members);
DELETE FROM records WHERE kind = 'ministries'    AND id IN (SELECT id FROM ministries);
DELETE FROM records WHERE kind = 'events'        AND id IN (SELECT id FROM events);
DELETE FROM records WHERE kind = 'attendance'    AND id IN (SELECT id FROM attendance);
DELETE FROM records WHERE kind = 'donations'     AND id IN (SELECT id FROM donations);
DELETE FROM records WHERE kind = 'announcements' AND id IN (SELECT id FROM announcements);
DELETE FROM records WHERE kind = 'settings';

ALTER TABLE records RENAME TO legacy_records;
