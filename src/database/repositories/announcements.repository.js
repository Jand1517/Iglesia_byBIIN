/** RF-07 · Comunicados (único módulo con eliminación física). */
const { db } = require("../connection");
const { requiredText, toFlag, fromFlag, NOW_SQL } = require("./helpers");

const COLUMNS = "id, title, body, date, important";

const toApi = (row) => row && { ...row, important: fromFlag(row.important) };

const statements = {
  list: db.prepare(`SELECT ${COLUMNS} FROM announcements ORDER BY date DESC, created_at DESC`),
  findById: db.prepare(`SELECT ${COLUMNS} FROM announcements WHERE id = ?`),
  upsert: db.prepare(`
    INSERT INTO announcements (${COLUMNS})
    VALUES (@id, @title, @body, @date, @important)
    ON CONFLICT (id) DO UPDATE SET
      title = excluded.title, body = excluded.body, date = excluded.date,
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
      important: toFlag(body.important),
    });
    return announcementsRepository.findById(body.id);
  },

  remove: (id) => statements.remove.run(id),
};

module.exports = { announcementsRepository };
