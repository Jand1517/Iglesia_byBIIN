/** RF-04 · Eventos. */
const { db } = require("../connection");
const {
  requiredText,
  optionalText,
  optionalId,
  toFlag,
  fromFlag,
  NOW_SQL,
} = require("./helpers");

const COLUMNS =
  "id, title, date, time, place, description, responsible_id, ministry_id, cancelled, type";

const toApi = (row) =>
  row && {
    id: row.id,
    title: row.title,
    type: row.type,
    date: row.date,
    time: row.time,
    place: row.place,
    description: row.description,
    responsible: row.responsible_id,
    ministry: row.ministry_id,
    cancelled: fromFlag(row.cancelled),
  };

const statements = {
  list: db.prepare(`SELECT ${COLUMNS} FROM events ORDER BY date, time`),
  findById: db.prepare(`SELECT ${COLUMNS} FROM events WHERE id = ?`),
  exists: db.prepare("SELECT 1 FROM events WHERE id = ?").pluck(),
  upsert: db.prepare(`
    INSERT INTO events (${COLUMNS})
    VALUES (@id, @title, @date, @time, @place, @description,
            @responsible_id, @ministry_id, @cancelled, @type)
    ON CONFLICT (id) DO UPDATE SET
      title = excluded.title, type = excluded.type, date = excluded.date, time = excluded.time,
      place = excluded.place, description = excluded.description,
      responsible_id = excluded.responsible_id, ministry_id = excluded.ministry_id,
      cancelled = excluded.cancelled, updated_at = ${NOW_SQL}`),
};

const eventsRepository = {
  list: () => statements.list.all().map(toApi),
  findById: (id) => toApi(statements.findById.get(id)),
  exists: (id) => Boolean(statements.exists.get(id)),

  save(body) {
    statements.upsert.run({
      id: body.id,
      title: requiredText(body.title),
      type: body.type ?? 'sin_clasificar',
      date: body.date,
      time: body.time,
      place: requiredText(body.place),
      description: optionalText(body.description),
      responsible_id: optionalId(body.responsible),
      ministry_id: optionalId(body.ministry),
      cancelled: toFlag(body.cancelled),
    });
    return eventsRepository.findById(body.id);
  },
};

module.exports = { eventsRepository };
