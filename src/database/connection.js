/** Conexión única a SQLite (better-sqlite3) y aplicación de migraciones. */
const fs = require("node:fs");
const Database = require("better-sqlite3");
const { env, DATA_DIR } = require("../config/env");
const { runMigrations } = require("./migrate");

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(env.dbPath());
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");

const applied = runMigrations(db);
if (applied.length) console.log("Migraciones aplicadas:", applied.join(", "));

// Debe quedar activo siempre: SQLite lo desactiva por defecto.
db.pragma("foreign_keys = ON");

module.exports = { db };
