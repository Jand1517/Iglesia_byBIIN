/**
 * RF-04 · Eventos y sus responsables (tabla puente event_responsibles).
 * Forma en la API: { ..., responsibles: [memberId, ...] }.
 */
const { db } = require("../connection");
const {
  requiredText,
  optionalText,
  optionalId,
  toFlag,
  fromFlag,
  groupBy,
  NOW_SQL,
} = require("./helpers");

const COLUMNS =
  "id, title, type, date, time, place, description, ministry_id, cancelled";

const toApi = (row, responsibles) =>
  row && {
    id: row.id,
    title: row.title,
    type: row.type,
    date: row.date,
    time: row.time,
    place: row.place,
    description: row.description,
    responsibles,
    ministry: row.ministry_id,
    cancelled: fromFlag(row.cancelled),
  };

const statements = {
  list: db.prepare(`SELECT ${COLUMNS} FROM events ORDER BY date, time`),
  findById: db.prepare(`SELECT ${COLUMNS} FROM events WHERE id = ?`),
  exists: db.prepare("SELECT 1 FROM events WHERE id = ?").pluck(),
  allResponsibles: db.prepare("SELECT event_id, member_id FROM event_responsibles"),
  responsiblesOf: db
    .prepare("SELECT member_id FROM event_responsibles WHERE event_id = ?")
    .pluck(),
  upsert: db.prepare(`
    INSERT INTO events (${COLUMNS})
    VALUES (@id, @title, @type, @date, @time, @place, @description,
            @ministry_id, @cancelled)
    ON CONFLICT (id) DO UPDATE SET
      title = excluded.title, type = excluded.type, date = excluded.date,
      time = excluded.time, place = excluded.place,
      description = excluded.description, ministry_id = excluded.ministry_id,
      cancelled = excluded.cancelled, updated_at = ${NOW_SQL}`),
  clearResponsibles: db.prepare("DELETE FROM event_responsibles WHERE event_id = ?"),
  addResponsible: db.prepare(
    "INSERT OR IGNORE INTO event_responsibles (event_id, member_id) VALUES (?, ?)",
  ),
};

const saveTransaction = db.transaction((body) => {
  statements.upsert.run({
    id: body.id,
    title: requiredText(body.title),
    type: body.type,
    date: body.date,
    time: body.time,
    place: requiredText(body.place),
    description: optionalText(body.description),
    ministry_id: optionalId(body.ministry),
    cancelled: toFlag(body.cancelled),
  });
  statements.clearResponsibles.run(body.id);
  for (const memberId of body.responsibles) statements.addResponsible.run(body.id, memberId);
});

const eventsRepository = {
  list() {
    const responsibles = groupBy(statements.allResponsibles.all(), "event_id", "member_id");
    return statements.list.all().map((row) => toApi(row, responsibles.get(row.id) || []));
  },

  findById: (id) => toApi(statements.findById.get(id), statements.responsiblesOf.all(id)),
  exists: (id) => Boolean(statements.exists.get(id)),

  /** Guarda el evento y reemplaza sus responsables en una transacción. */
  save(body) {
    saveTransaction(body);
    return eventsRepository.findById(body.id);
  },
};

module.exports = { eventsRepository };
