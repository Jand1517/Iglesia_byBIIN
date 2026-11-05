/**
 * Migración de una base existente con el formato antiguo (tabla `records` en
 * JSON) hacia las tablas relacionales, incluyendo datos sucios.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Database = require("better-sqlite3");
const { runMigrations } = require("../src/database/migrate");

const LEGACY_SCHEMA = fs.readFileSync(
  path.join(__dirname, "..", "src", "database", "migrations", "001_initial.sql"),
  "utf8",
);

function createLegacyDatabase() {
  const db = new Database(":memory:");
  db.exec(LEGACY_SCHEMA);
  db.prepare("INSERT INTO users VALUES ('u1','Admin@Example.org','Admin','administrador','s:h')").run();
  const insert = db.prepare("INSERT INTO records VALUES (?, ?, ?)");
  const add = (kind, record) => insert.run(kind, record.id, JSON.stringify(record));

  add("members", { id: "m1", name: "Ana", joined: "2026-01-01", active: true, email: "no-es-correo" });
  add("members", { id: "m2", name: "Luis", joined: "2026-01-02", active: false });
  add("members", { id: "m3", name: "", joined: "2026-01-03" }); // nombre vacío
  add("ministries", { id: "x1", name: "Jóvenes", coordinator: "fantasma", members: ["m1", "fantasma", "m2"] });
  add("events", { id: "e1", title: "Culto", date: "2026-11-08", time: "10:00", place: "Templo", ministry: "x1", responsible: "m2" });
  add("events", { id: "e2", title: "Malo", date: "ayer", time: "10:00", place: "T" }); // fecha inválida
  add("attendance", { id: "a1", event: "e1", date: "2026-11-08", present: ["m1", "m2"], roster: ["m1"] });
  add("donations", { id: "d1", date: "2026-11-01", amount: "150.10", concept: "Ofrenda", method: "Bitcoin", member: "fantasma" });
  add("announcements", { id: "n1", title: "Aviso", body: "Texto", date: "2026-11-08", important: true });
  add("settings", { id: "otro", name: "Duplicado" });
  add("settings", { id: "church", name: "Iglesia Real", schedule: "Domingo 10:00" });
  return db;
}

test("migra los datos antiguos sin perder información", () => {
  const db = createLegacyDatabase();
  const applied = runMigrations(db);
  assert.deepEqual(applied, [
    "001_initial.sql",
    "002_relational_schema.sql",
    "003_migrate_legacy_records.sql",
    "004_user_status_event_type.sql",
  ]);

  const all = (sql) => db.prepare(sql).all();
  const one = (sql) => db.prepare(sql).get();

  // Usuarios: correo normalizado.
  assert.equal(one("SELECT email FROM users").email, "admin@example.org");
  assert.equal(one("SELECT active FROM users").active, 1);
  assert.equal(one("SELECT type FROM events WHERE id='e1'").type, "sin_clasificar");

  // Miembros: correo inválido → NULL; estado conservado.
  assert.deepEqual(all("SELECT id, email, active FROM members ORDER BY id"), [
    { id: "m1", email: null, active: 1 },
    { id: "m2", email: null, active: 0 },
  ]);

  // Ministerio: coordinador fantasma → NULL; integrante fantasma descartado.
  assert.equal(one("SELECT coordinator_id FROM ministries").coordinator_id, null);
  assert.equal(one("SELECT COUNT(*) n FROM ministry_members").n, 2);

  // Asistencia: el presente fuera del padrón se agrega como presente.
  assert.deepEqual(
    all("SELECT member_id, present FROM attendance_members ORDER BY member_id"),
    [
      { member_id: "m1", present: 1 },
      { member_id: "m2", present: 1 },
    ],
  );

  // Aportación: pesos → centavos, método desconocido → 'Otro'.
  assert.deepEqual(one("SELECT amount_cents, method, member_id FROM donations"), {
    amount_cents: 15010,
    method: "Otro",
    member_id: null,
  });

  // Ajustes: una sola fila, tomada del registro 'church'.
  assert.deepEqual(one("SELECT id, name, schedule FROM church_settings"), {
    id: 1,
    name: "Iglesia Real",
    schedule: "Domingo 10:00",
  });

  // Lo que no cumplió las reglas queda guardado para revisión.
  assert.deepEqual(
    all("SELECT kind, id FROM legacy_records ORDER BY kind, id"),
    [
      { kind: "events", id: "e2" },
      { kind: "members", id: "m3" },
    ],
  );

  assert.deepEqual(db.pragma("foreign_key_check"), []);
  assert.deepEqual(runMigrations(db), [], "no debe repetir migraciones");
  db.close();
});

test("abre un archivo antiguo real y lo migra al iniciar", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "iglesia-"));
  const file = path.join(dir, "church.sqlite");
  const source = createLegacyDatabase();
  fs.writeFileSync(file, source.serialize());
  source.close();

  const db = new Database(file);
  runMigrations(db);
  assert.equal(db.prepare("SELECT COUNT(*) FROM members").pluck().get(), 2);
  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});
