const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
process.env.DB_PATH = ":memory:";
process.env.DEV_RECOVERY = "1";
const { server, db } = require("../src/server");
const { createClient, listen, close } = require("./helpers/api-client");
let admin, adminId;
const password = "una-clave-segura";
const account = (name, role = "secretario") => ({ name, email: `${name}@example.org`, role, password });
async function createUser(profile) {
  assert.equal((await admin("users", profile)).status, 201);
  return (await admin("users")).body.find((user) => user.email === profile.email);
}
before(async () => {
  await listen(server);
  admin = createClient(server);
  await admin("setup", account("admin"));
  await admin("login", account("admin"));
  adminId = (await admin("me")).body.id;
});
after(async () => { await close(server); db.close(); });

test("edita nombre, correo y todos los roles sin exponer ni cambiar la contraseña", async () => {
  const original = await createUser(account("editar"));
  const originalHash = db.prepare("SELECT hash FROM users WHERE id=?").pluck().get(original.id);
  const client = createClient(server);
  for (const role of ["pastor", "secretario", "tesorero", "coordinador", "administrador"]) {
    const next = { ...original, name: "Nombre editado", email: " EDITADO@example.org ", role };
    assert.equal((await admin("users", next, "PUT")).status, 200);
    assert.equal((await client("login", { email: "editado@example.org", password })).status, 200);
    assert.equal((await client("me")).body.role, role);
    const listed = (await admin("users")).body.find((row) => row.id === original.id);
    assert.deepEqual(listed, { id: original.id, name: next.name, email: "editado@example.org", role, active: true });
    assert.equal(db.prepare("SELECT hash FROM users WHERE id=?").pluck().get(original.id), originalHash);
  }
});

test("valida duplicados, roles, estado, identificadores y datos de edición", async () => {
  const user = await createUser(account("validar"));
  assert.equal((await admin("users", { ...user, email: "ADMIN@example.org" }, "PUT")).status, 409);
  for (const change of [{ name: " " }, { name: 123 }, { email: "mal" }, { role: "superusuario" }])
    assert.equal((await admin("users", { ...user, ...change }, "PUT")).status, 400);
  assert.equal((await admin("users", { id: user.id, active: "false" }, "PATCH")).status, 400);
  assert.equal((await admin("users", {}, "DELETE")).status, 400);
  assert.equal((await admin("users", { id: "inexistente" }, "DELETE")).status, 404);
  assert.equal((await admin("users", { ...user, id: "inexistente" }, "PUT")).status, 404);
});

test("un cambio de rol cierra las sesiones abiertas y aplica los permisos nuevos", async () => {
  const profile = account("permisos", "tesorero");
  const user = await createUser(profile);
  const client = createClient(server);
  await client("login", profile);
  assert.equal((await client("donations")).status, 200);
  assert.equal((await admin("users", { ...user, role: "coordinador" }, "PUT")).status, 200);
  assert.equal((await client("me")).status, 401);
  await client("login", profile);
  assert.equal((await client("donations")).status, 403);
  for (const method of ["PUT", "PATCH", "DELETE"])
    assert.equal((await client("users", { ...user, active: false }, method)).status, 403);
});

test("desactiva y reactiva: invalida todas las sesiones y códigos de recuperación", async () => {
  const profile = account("estado");
  const user = await createUser(profile);
  const first = createClient(server), second = createClient(server);
  await first("login", profile);
  await second("login", profile);
  const recovery = (await first("recover", { email: profile.email })).body.token;
  assert.ok(recovery);
  assert.equal((await admin("users", { id: user.id, active: false }, "PATCH")).status, 200);
  for (const client of [first, second]) assert.equal((await client("me")).status, 401);
  assert.equal((await first("login", profile)).status, 401);
  assert.equal((await first("recover", { email: profile.email })).body.token, undefined);
  assert.equal((await first("reset", { token: recovery, password })).status, 400);
  assert.equal((await admin("users")).body.find((row) => row.id === user.id).active, false);
  assert.equal((await admin("users", { id: user.id, active: true }, "PATCH")).status, 200);
  assert.equal((await first("login", profile)).status, 200);
});

test("elimina cuentas y sus sesiones/códigos, sin reabrir la configuración inicial", async () => {
  const profile = account("eliminar");
  const user = await createUser(profile);
  const client = createClient(server);
  await client("login", profile);
  await client("recover", { email: profile.email });
  assert.equal((await admin("users", { id: user.id }, "DELETE")).status, 200);
  assert.equal((await client("me")).status, 401);
  assert.equal((await client("login", profile)).status, 401);
  assert.equal((await admin("status")).body.setup, false);
  for (const table of ["sessions", "resets"])
    assert.equal(db.prepare(`SELECT COUNT(*) FROM ${table} WHERE user_id=?`).pluck().get(user.id), 0);
  assert.ok(!(await admin("users")).body.some((row) => row.id === user.id));
});

test("protege la cuenta del administrador que está usando el sistema", async () => {
  const current = (await admin("users")).body.find((row) => row.id === adminId);
  assert.equal((await admin("users", { id: adminId }, "DELETE")).status, 409);
  assert.equal((await admin("users", { id: adminId, active: false }, "PATCH")).status, 409);
  assert.equal((await admin("users", { ...current, role: "pastor" }, "PUT")).status, 409);
  assert.equal((await admin("users", { ...current, name: "Administrador editado" }, "PUT")).status, 200);
  assert.equal((await admin("me")).body.name, "Administrador editado");
});

test("persiste, edita y valida los tipos religioso y administrativo", async () => {
  const draft = { title: "Evento", date: "2026-11-08", time: "10:00", place: "Templo" };
  const religious = await admin("events", { ...draft, type: "religioso" });
  assert.equal(religious.status, 200);
  assert.equal(religious.body.type, "religioso");
  const administrative = await admin("events", { ...religious.body, type: "administrativo" });
  assert.equal(administrative.status, 200);
  assert.equal(administrative.body.type, "administrativo");
  assert.equal((await admin("events")).body.find((row) => row.id === religious.body.id).type, "administrativo");
  const { type, ...oldClient } = administrative.body;
  assert.equal((await admin("events", oldClient)).body.type, "administrativo");
  for (const type of ["fiesta", "", null, 42])
    assert.equal((await admin("events", { ...draft, type })).status, 400);
  assert.throws(() => db.prepare("UPDATE events SET type='inventado' WHERE id=?").run(religious.body.id), { code: "SQLITE_CONSTRAINT_CHECK" });
});

test("sirve ExcelJS localmente y conserva el aislamiento de archivos privados", async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const bundle = await fetch(base + "/vendor/exceljs.min.js");
  assert.equal(bundle.status, 200);
  assert.match(bundle.headers.get("content-type"), /javascript/);
  assert.match(bundle.headers.get("content-security-policy"), /script-src 'self'/);
  assert.equal((await fetch(base + "/node_modules/exceljs/package.json")).status, 404);
});
