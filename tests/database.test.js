/**
 * Reglas de la base relacional vistas desde la API: validaciones, llaves
 * foráneas, montos en centavos, padrón de asistencia y fila única de ajustes.
 */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
process.env.DB_PATH = ":memory:";
const { server, db } = require("../src/server");
const { createClient, listen, close } = require("./helpers/api-client");

let req;
let ana;
let luis;
let culto;

before(async () => {
  await listen(server);
  req = createClient(server);
  const admin = { name: "Admin", email: "admin@example.org", password: "una-clave-segura" };
  await req("setup", admin);
  await req("login", admin);
  ana = (await req("members", { name: "Ana", joined: "2026-01-10", active: true })).body;
  luis = (await req("members", { name: "Luis", joined: "2026-02-10", active: true })).body;
  culto = (
    await req("events", { title: "Culto", date: "2026-11-08", time: "10:00", place: "Templo" })
  ).body;
});

after(async () => {
  await close(server);
  db.close();
});

test("las llaves foráneas están activas", () => {
  assert.equal(db.pragma("foreign_keys", { simple: true }), 1);
});

test("rechaza fechas y horas inválidas", async () => {
  const bad = (await req("events", { title: "X", date: "ayer", time: "10:00", place: "T" }));
  assert.equal(bad.status, 400);
  assert.equal(
    (await req("events", { title: "X", date: "2026-02-30", time: "10:00", place: "T" })).status,
    400,
  );
  assert.equal(
    (await req("events", { title: "X", date: "2026-02-10", time: "25:99", place: "T" })).status,
    400,
  );
  assert.equal((await req("members", { name: "Y", joined: "zzz" })).status, 400);
});

test("rechaza referencias a registros inexistentes", async () => {
  assert.equal(
    (await req("ministries", { name: "M", coordinator: "fantasma", members: [] })).status,
    400,
  );
  assert.equal(
    (await req("ministries", { name: "M", coordinator: ana.id, members: ["fantasma"] })).status,
    400,
  );
  assert.equal(
    (
      await req("donations", {
        date: "2026-11-01", amount: 10, concept: "Ofrenda", method: "Efectivo", member: "fantasma",
      })
    ).status,
    400,
  );
});

test("la base rechaza datos inválidos aunque se salte el validador", () => {
  assert.throws(
    () => db.prepare("INSERT INTO donations (id,date,amount_cents,concept,method) VALUES ('x','2026-01-01',-5,'c','Efectivo')").run(),
    { code: "SQLITE_CONSTRAINT_CHECK" },
  );
  assert.throws(
    () => db.prepare("INSERT INTO donations (id,date,amount_cents,concept,method,member_id) VALUES ('y','2026-01-01',5,'c','Efectivo','fantasma')").run(),
    { code: "SQLITE_CONSTRAINT_FOREIGNKEY" },
  );
  assert.throws(
    () => db.prepare("INSERT INTO users (id,email,name,role,hash) VALUES ('z','z@z.com','Z','superusuario','h')").run(),
    { code: "SQLITE_CONSTRAINT_CHECK" },
  );
});

test("los montos se guardan en centavos sin errores de redondeo", async () => {
  const methods = ["Efectivo", "Transferencia"];
  for (const [i, amount] of ["0.10", "0.20", "150.35"].entries())
    assert.equal(
      (await req("donations", { date: "2026-11-01", amount, concept: "Ofrenda", method: methods[i % 2] })).status,
      200,
    );
  const cents = db.prepare("SELECT SUM(amount_cents) FROM donations").pluck().get();
  assert.equal(cents, 15065);
  const api = (await req("donations")).body;
  assert.deepEqual(api.map((d) => d.amount).sort((a, b) => a - b), [0.1, 0.2, 150.35]);
  assert.equal(
    (await req("donations", { date: "2026-11-01", amount: "1.005", concept: "c", method: "Otro" })).status,
    400,
  );
  assert.equal(
    (await req("donations", { date: "2026-11-01", amount: "10", concept: "c", method: "Bitcoin" })).status,
    400,
  );
});

test("ignora campos desconocidos enviados por el cliente", async () => {
  const saved = (
    await req("members", { name: "Eva", joined: "2026-03-01", basura: "x".repeat(1000) })
  ).body;
  assert.equal(saved.basura, undefined);
  assert.equal(saved.active, true);
});

test("la asistencia guarda padrón, presentes y evita duplicados", async () => {
  const first = await req("attendance", { event: culto.id, date: "2026-11-08", present: [ana.id] });
  assert.equal(first.status, 200);
  assert.deepEqual(first.body.present, [ana.id]);
  assert.ok(first.body.roster.includes(luis.id));

  // Luis se desactiva: el padrón original no cambia al editar.
  await req("members", { ...luis, active: false });
  const edited = await req("attendance", { ...first.body, present: [luis.id] });
  assert.deepEqual(edited.body.present, [luis.id]);
  assert.ok(edited.body.roster.includes(ana.id));

  assert.equal(
    (await req("attendance", { event: culto.id, date: "2026-11-08", present: [] })).status,
    409,
  );
});

test("los ministerios guardan sus integrantes", async () => {
  const ministry = (
    await req("ministries", { name: "Jóvenes", coordinator: ana.id, members: [ana.id, luis.id] })
  ).body;
  assert.deepEqual(ministry.members.sort(), [ana.id, luis.id].sort());
  const updated = (await req("ministries", { ...ministry, members: [luis.id] })).body;
  assert.deepEqual(updated.members, [luis.id]);
});

test("los datos de la iglesia son una sola fila", async () => {
  await req("settings", { id: "otro", name: "Iglesia Uno" });
  await req("settings", { id: "church", name: "Iglesia Dos" });
  const settings = (await req("settings")).body;
  assert.equal(settings.length, 1);
  assert.equal(settings[0].name, "Iglesia Dos");
  assert.equal(
    (await req("settings", { name: "Iglesia", logo: "javascript:alert(1)" })).status,
    400,
  );
});
