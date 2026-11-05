/**
 * Ejecutor de migraciones.
 *
 * - Cada archivo `migrations/NNN_nombre.sql` se aplica una sola vez, en orden.
 * - Las aplicadas se registran en `schema_migrations`.
 * - Cada migración corre dentro de una transacción: si falla, no queda a medias.
 * - Las llaves foráneas se desactivan durante las migraciones (SQLite lo exige
 *   para reconstruir tablas) y al final se valida toda la base con
 *   `PRAGMA foreign_key_check` antes de reactivarlas.
 *
 * Reglas para el equipo:
 *   1. Nunca edites una migración que ya se compartió; crea una nueva.
 *   2. Usa el siguiente número disponible (004_, 005_, ...).
 */
const fs = require("node:fs");
const path = require("node:path");

const MIGRATIONS_DIR = path.join(__dirname, "migrations");
const FILE_PATTERN = /^(\d{3})_[\w-]+\.sql$/;

function listMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => FILE_PATTERN.test(file))
    .sort();
}

/** Aplica las migraciones pendientes y devuelve sus nombres. */
function runMigrations(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name       TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`);

  const applied = new Set(
    db.prepare("SELECT name FROM schema_migrations").pluck().all(),
  );
  const pending = listMigrationFiles().filter((file) => !applied.has(file));
  if (!pending.length) return [];

  const record = db.prepare("INSERT INTO schema_migrations (name) VALUES (?)");
  db.pragma("foreign_keys = OFF");
  try {
    for (const file of pending) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      db.transaction(() => {
        db.exec(sql);
        record.run(file);
      })();
    }
    const violations = db.pragma("foreign_key_check");
    if (violations.length)
      throw new Error(
        "Las migraciones dejaron llaves foráneas inválidas: " +
          JSON.stringify(violations.slice(0, 5)),
      );
  } finally {
    db.pragma("foreign_keys = ON");
  }
  return pending;
}

module.exports = { runMigrations };
