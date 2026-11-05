/** RF-02 · Miembros. */
const { db } = require("../connection");
const { optionalText, requiredText, fromFlag, NOW_SQL } = require("./helpers");

const COLUMNS = "id, name, phone, email, joined, active";

const toApi = (row) => row && { ...row, active: fromFlag(row.active) };

const statements = {
  list: db.prepare(`SELECT ${COLUMNS} FROM members ORDER BY name COLLATE NOCASE`),
  findById: db.prepare(`SELECT ${COLUMNS} FROM members WHERE id = ?`),
  exists: db.prepare("SELECT 1 FROM members WHERE id = ?").pluck(),
  activeIds: db.prepare("SELECT id FROM members WHERE active = 1").pluck(),
  upsert: db.prepare(`
    INSERT INTO members (id, name, phone, email, joined, active)
    VALUES (@id, @name, @phone, @email, @joined, @active)
    ON CONFLICT (id) DO UPDATE SET
      name = excluded.name, phone = excluded.phone, email = excluded.email,
      joined = excluded.joined, active = excluded.active, updated_at = ${NOW_SQL}`),
};

const membersRepository = {
  list: () => statements.list.all().map(toApi),
  findById: (id) => toApi(statements.findById.get(id)),
  exists: (id) => Boolean(statements.exists.get(id)),
  activeIds: () => statements.activeIds.all(),

  save(body) {
    statements.upsert.run({
      id: body.id,
      name: requiredText(body.name),
      phone: optionalText(body.phone),
      email: optionalText(body.email),
      joined: body.joined,
      // Se conserva la convención original: activo salvo que sea `false`.
      active: body.active === false || body.active === "false" ? 0 : 1,
    });
    return membersRepository.findById(body.id);
  },
};

module.exports = { membersRepository };
