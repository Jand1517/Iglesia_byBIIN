/** RF-05 · Ministerios y sus integrantes (tabla puente ministry_members). */
const { db } = require("../connection");
const { requiredText, optionalId, groupBy, NOW_SQL } = require("./helpers");

const statements = {
  list: db.prepare(
    "SELECT id, name, coordinator_id FROM ministries ORDER BY name COLLATE NOCASE",
  ),
  findById: db.prepare("SELECT id, name, coordinator_id FROM ministries WHERE id = ?"),
  exists: db.prepare("SELECT 1 FROM ministries WHERE id = ?").pluck(),
  allMembers: db.prepare("SELECT ministry_id, member_id FROM ministry_members"),
  membersOf: db
    .prepare("SELECT member_id FROM ministry_members WHERE ministry_id = ?")
    .pluck(),
  upsert: db.prepare(`
    INSERT INTO ministries (id, name, coordinator_id)
    VALUES (@id, @name, @coordinator_id)
    ON CONFLICT (id) DO UPDATE SET
      name = excluded.name, coordinator_id = excluded.coordinator_id,
      updated_at = ${NOW_SQL}`),
  clearMembers: db.prepare("DELETE FROM ministry_members WHERE ministry_id = ?"),
  addMember: db.prepare(
    "INSERT OR IGNORE INTO ministry_members (ministry_id, member_id) VALUES (?, ?)",
  ),
};

const toApi = (row, members) =>
  row && {
    id: row.id,
    name: row.name,
    coordinator: row.coordinator_id,
    members,
  };

const saveTransaction = db.transaction((body) => {
  statements.upsert.run({
    id: body.id,
    name: requiredText(body.name),
    coordinator_id: optionalId(body.coordinator),
  });
  statements.clearMembers.run(body.id);
  for (const memberId of body.members || []) statements.addMember.run(body.id, memberId);
});

const ministriesRepository = {
  list() {
    const members = groupBy(statements.allMembers.all(), "ministry_id", "member_id");
    return statements.list.all().map((row) => toApi(row, members.get(row.id) || []));
  },

  findById: (id) => toApi(statements.findById.get(id), statements.membersOf.all(id)),
  exists: (id) => Boolean(statements.exists.get(id)),

  /** Guarda el ministerio y reemplaza la lista de integrantes en una transacción. */
  save(body) {
    saveTransaction(body);
    return ministriesRepository.findById(body.id);
  },
};

module.exports = { ministriesRepository };
