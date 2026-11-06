/**
 * RF-07 · Comunicados (único módulo con eliminación física).
 * `date` es la fecha de publicación y `expires_on` (opcional) el último día
 * en que el aviso sigue vigente.
 */
const { db } = require("../connection");
const { requiredText, optionalText, toFlag, fromFlag, NOW_SQL } = require("./helpers");

const COLUMNS = "id, title, body, date, expires_on, important";

const toApi = (row) =>
  row && {
    id: row.id,
    title: row.title,
    body: row.body,
    date: row.date,
    expires: row.expires_on,
    important: fromFlag(row.important),
  };

const statements = {
  list: db.prepare(`SELECT ${COLUMNS} FROM announcements ORDER BY date DESC, created_at DESC`),
  findById: db.prepare(`SELECT ${COLUMNS} FROM announcements WHERE id = ?`),
  upsert: db.prepare(`
    INSERT INTO announcements (${COLUMNS})
    VALUES (@id, @title, @body, @date, @expires_on, @important)
    ON CONFLICT (id) DO UPDATE SET
      title = excluded.title, body = excluded.body, date = excluded.date,
      expires_on = excluded.expires_on,
      important = excluded.important, updated_at = ${NOW_SQL}`),
  remove: db.prepare("DELETE FROM announcements WHERE id = ?"),
};

const announcementsRepository = {
  list: () => statements.list.all().map(toApi),
  findById: (id) => toApi(statements.findById.get(id)),

  save(body) {
    statements.upsert.run({
      id: body.id,
      title: requiredText(body.title),
      body: requiredText(body.body),
      date: body.date,
      expires_on: optionalText(body.expires),
      important: toFlag(body.important),
    });
    return announcementsRepository.findById(body.id);
  },

  remove: (id) => statements.remove.run(id),
};

module.exports = { announcementsRepository };
