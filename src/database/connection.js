/** Conexión única a SQLite y creación del esquema. */
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { env, DATA_DIR } = require("../config/env");

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(env.dbPath());
db.exec(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));

module.exports = { db };
