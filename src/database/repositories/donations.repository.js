/**
 * RF-06 · Aportaciones. En la base se guardan centavos (amount_cents); la API
 * sigue recibiendo y devolviendo pesos (`amount`).
 */
const { db } = require("../connection");
const {
  requiredText,
  optionalId,
  toCents,
  fromCents,
  NOW_SQL,
} = require("./helpers");

const COLUMNS = "id, date, amount_cents, concept, method, member_id";

const toApi = (row) =>
  row && {
    id: row.id,
    date: row.date,
    amount: fromCents(row.amount_cents),
    concept: row.concept,
    method: row.method,
    member: row.member_id,
  };

const statements = {
  list: db.prepare(`SELECT ${COLUMNS} FROM donations ORDER BY date, created_at`),
  findById: db.prepare(`SELECT ${COLUMNS} FROM donations WHERE id = ?`),
  upsert: db.prepare(`
    INSERT INTO donations (${COLUMNS})
    VALUES (@id, @date, @amount_cents, @concept, @method, @member_id)
    ON CONFLICT (id) DO UPDATE SET
      date = excluded.date, amount_cents = excluded.amount_cents,
      concept = excluded.concept, method = excluded.method,
      member_id = excluded.member_id, updated_at = ${NOW_SQL}`),
};

const donationsRepository = {
  list: () => statements.list.all().map(toApi),
  findById: (id) => toApi(statements.findById.get(id)),

  save(body) {
    statements.upsert.run({
      id: body.id,
      date: body.date,
      amount_cents: toCents(body.amount),
      concept: requiredText(body.concept),
      method: body.method,
      member_id: optionalId(body.member),
    });
    return donationsRepository.findById(body.id);
  },
};

module.exports = { donationsRepository };
