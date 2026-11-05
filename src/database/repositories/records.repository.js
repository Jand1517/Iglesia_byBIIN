const { db } = require("../connection");

/**
 * Acceso a los registros de los módulos (members, events, attendance, ...).
 * Cada registro se guarda como JSON dentro de la tabla `records`.
 */
const recordsRepository = {
  list: (kind) =>
    db
      .prepare("SELECT data FROM records WHERE kind=?")
      .all(kind)
      .map((row) => JSON.parse(row.data)),

  /** Inserta o reemplaza el registro completo y lo devuelve. */
  save: (kind, record) => {
    db.prepare("INSERT OR REPLACE INTO records VALUES(?,?,?)").run(
      kind,
      record.id,
      JSON.stringify(record),
    );
    return record;
  },

  remove: (kind, id) =>
    db.prepare("DELETE FROM records WHERE kind=? AND id=?").run(kind, id),
};

module.exports = { recordsRepository };
