/**
 * RF-03 · Asistencia.
 *
 * Cada lista de asistencia tiene un padrón (attendance_members): los miembros
 * convocados ese día, con present = 1 o 0. El padrón se fija al crear la
 * lista con los miembros activos en ese momento; al editar solo cambian las
 * marcas de presente/ausente.
 *
 * Forma en la API: { id, event, date, present: [ids], roster: [ids] }.
 */
const { db } = require("../connection");
const { NOW_SQL } = require("./helpers");
const { membersRepository } = require("./members.repository");

const statements = {
  list: db.prepare("SELECT id, event_id, date FROM attendance ORDER BY date, created_at"),
  findById: db.prepare("SELECT id, event_id, date FROM attendance WHERE id = ?"),
  exists: db.prepare("SELECT 1 FROM attendance WHERE id = ?").pluck(),
  findByEventAndDate: db
    .prepare("SELECT id FROM attendance WHERE event_id = ? AND date = ?")
    .pluck(),
  allMembers: db.prepare(
    "SELECT attendance_id, member_id, present FROM attendance_members",
  ),
  membersOf: db.prepare(
    "SELECT attendance_id, member_id, present FROM attendance_members WHERE attendance_id = ?",
  ),
  upsert: db.prepare(`
    INSERT INTO attendance (id, event_id, date) VALUES (@id, @event_id, @date)
    ON CONFLICT (id) DO UPDATE SET
      event_id = excluded.event_id, date = excluded.date, updated_at = ${NOW_SQL}`),
  addToRoster: db.prepare(`
    INSERT INTO attendance_members (attendance_id, member_id, present) VALUES (?, ?, ?)
    ON CONFLICT (attendance_id, member_id) DO UPDATE SET present = excluded.present`),
  markAllAbsent: db.prepare(
    "UPDATE attendance_members SET present = 0 WHERE attendance_id = ?",
  ),
};

function toApi(row, memberRows) {
  if (!row) return row;
  return {
    id: row.id,
    event: row.event_id,
    date: row.date,
    present: memberRows.filter((m) => m.present === 1).map((m) => m.member_id),
    roster: memberRows.map((m) => m.member_id),
  };
}

const saveTransaction = db.transaction((body) => {
  const isNew = !statements.exists.get(body.id);
  statements.upsert.run({ id: body.id, event_id: body.event, date: body.date });

  if (isNew) {
    for (const memberId of membersRepository.activeIds())
      statements.addToRoster.run(body.id, memberId, 0);
  } else {
    statements.markAllAbsent.run(body.id);
  }
  // Los presentes se marcan con 1; si no estaban en el padrón (p. ej. un
  // miembro inactivo que asistió) se agregan.
  for (const memberId of body.present) statements.addToRoster.run(body.id, memberId, 1);
});

const attendanceRepository = {
  list() {
    const byAttendance = new Map();
    for (const member of statements.allMembers.all()) {
      if (!byAttendance.has(member.attendance_id)) byAttendance.set(member.attendance_id, []);
      byAttendance.get(member.attendance_id).push(member);
    }
    return statements.list.all().map((row) => toApi(row, byAttendance.get(row.id) || []));
  },

  findById: (id) => toApi(statements.findById.get(id), statements.membersOf.all(id)),

  /** Id de la lista existente para ese evento y fecha, si la hay. */
  findIdByEventAndDate: (eventId, date) =>
    statements.findByEventAndDate.get(eventId, date),

  save(body) {
    saveTransaction(body);
    return attendanceRepository.findById(body.id);
  },
};

module.exports = { attendanceRepository };
