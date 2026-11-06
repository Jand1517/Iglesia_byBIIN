/**
 * Seguridad del acceso: límite de intentos, tiempo constante, cuerpos JSON
 * inválidos, cierre de sesión solo por POST y tokens guardados como hash.
 */
const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
process.env.DB_PATH = ":memory:";
process.env.DEV_RECOVERY = "1";
const { server, db } = require("../src/server");
const { clearAllLimiters, createRateLimiter } = require("../src/services/rate-limiter");
const { cleanupExpired } = require("../src/services/session-cleanup");
const { createClient, listen, close } = require("./helpers/api-client");

const ADMIN = { name: "Admin", email: "admin@example.org", password: "una-clave-segura" };
const base = () => "http://127.0.0.1:" + server.address().port + "/api/";
const sha256 = (v) => crypto.createHash("sha256").update(v).digest("hex");

/** Petición con cuerpo crudo (para probar JSON que no es objeto). */
const raw = (path, body, method = "POST", cookie = "") =>
  fetch(base() + path, {
    method,
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body,
  });

let adminReq;

before(async () => {
  await listen(server);
  adminReq = createClient(server);
  await adminReq("setup", ADMIN);
  await adminReq("login", ADMIN);
});

beforeEach(() => clearAllLimiters());

after(async () => {
  await close(server);
  db.close();
});

test("un cuerpo JSON que no es objeto responde 400, nunca 500", async () => {
  for (const body of ["null", "[]", "42", '"texto"', "true"]) {
    assert.equal((await raw("login", body)).status, 400, `login con ${body}`);
    assert.equal((await raw("setup", body)).status, 400, `setup con ${body}`);
  }
  const login = await fetch(base() + "login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN.email, password: ADMIN.password }),
  });
  const cookie = login.headers.get("set-cookie").split(";")[0];
  for (const method of ["PUT", "PATCH", "DELETE"])
    assert.equal((await raw("users", "null", method, cookie)).status, 400, `${method} /users`);
  assert.equal((await raw("members", "null", "POST", cookie)).status, 400);
  const response = await raw("login", "null");
  assert.match((await response.json()).error, /objeto JSON/);
});

test("cerrar sesión solo funciona con POST", async () => {
  const client = createClient(server);
  await client("login", ADMIN);
  assert.equal((await client("logout")).status, 405); // GET
  assert.equal((await client("logout", {}, "PUT")).status, 405);
  assert.equal((await client("me")).status, 200, "la sesión sigue abierta");
  assert.equal((await client("logout", {})).status, 200); // POST
  assert.equal((await client("me")).status, 401);
});

test("bloquea tras 5 contraseñas incorrectas para el mismo correo", async () => {
  const client = createClient(server);
  for (let i = 0; i < 5; i++)
    assert.equal((await client("login", { email: ADMIN.email, password: "mala" })).status, 401);

  const blocked = await fetch(base() + "login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ADMIN), // ¡aun con la contraseña correcta!
  });
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get("retry-after")) > 0);
  assert.match((await blocked.json()).error, /Demasiados intentos/);

  // Otro correo desde la misma IP sigue pudiendo intentar.
  assert.equal((await client("login", { email: "otro@example.org", password: "x" })).status, 401);
});

test("un inicio de sesión correcto reinicia el contador del correo", async () => {
  const client = createClient(server);
  for (let i = 0; i < 4; i++) await client("login", { email: ADMIN.email, password: "mala" });
  assert.equal((await client("login", ADMIN)).status, 200);
  for (let i = 0; i < 4; i++)
    assert.equal((await client("login", { email: ADMIN.email, password: "mala" })).status, 401);
});

test("bloquea una IP que prueba muchos correos distintos", async () => {
  const client = createClient(server);
  for (let i = 0; i < 20; i++)
    assert.equal((await client("login", { email: `u${i}@example.org`, password: "x" })).status, 401);
  assert.equal((await client("login", { email: "u99@example.org", password: "x" })).status, 429);
});

test("limita solicitudes de recuperación y códigos incorrectos", async () => {
  const client = createClient(server);
  for (let i = 0; i < 5; i++)
    assert.equal((await client("recover", { email: "nadie@example.org" })).status, 200);
  assert.equal((await client("recover", { email: "nadie@example.org" })).status, 429);

  for (let i = 0; i < 10; i++)
    assert.equal((await client("reset", { token: "f".repeat(64), password: "nueva-clave-123" })).status, 400);
  assert.equal((await client("reset", { token: "f".repeat(64), password: "nueva-clave-123" })).status, 429);
});

test("el login tarda lo mismo exista o no el correo", async () => {
  const client = createClient(server);
  const timeOf = async (email) => {
    const start = process.hrtime.bigint();
    await client("login", { email, password: "incorrecta" });
    return Number(process.hrtime.bigint() - start) / 1e6;
  };
  const median = (xs) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const existing = [];
  const missing = [];
  for (let i = 0; i < 4; i++) {
    clearAllLimiters();
    existing.push(await timeOf(ADMIN.email));
    missing.push(await timeOf(`nadie${i}@example.org`));
  }
  const ratio = median(existing) / median(missing);
  // Antes: ~18× más lento con un correo real. Ahora ambos ejecutan scrypt.
  assert.ok(ratio > 0.5 && ratio < 2, `proporción de tiempos ${ratio.toFixed(2)}`);
});

test("las sesiones y los códigos se guardan como hash, no en texto plano", async () => {
  const response = await fetch(base() + "login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ADMIN),
  });
  const token = /session=([a-f0-9]+)/.exec(response.headers.get("set-cookie"))[1];
  const hashes = db.prepare("SELECT token_hash FROM sessions").pluck().all();
  assert.ok(!hashes.includes(token), "el token no debe estar en la base");
  assert.ok(hashes.includes(sha256(token)), "debe estar su SHA-256");

  const code = (await createClient(server)("recover", { email: ADMIN.email })).body.token;
  const resetHashes = db.prepare("SELECT token_hash FROM resets").pluck().all();
  assert.ok(!resetHashes.includes(code));
  assert.ok(resetHashes.includes(sha256(code)));
});

test("borra las sesiones y los códigos vencidos", () => {
  const userId = db.prepare("SELECT id FROM users").pluck().get();
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires) VALUES ('vieja', ?, 1)").run(userId);
  db.prepare("INSERT INTO resets (token_hash, user_id, expires) VALUES ('viejo', ?, 1)").run(userId);
  const removed = cleanupExpired();
  assert.ok(removed.sessions >= 1);
  assert.ok(removed.resets >= 1);
  assert.equal(db.prepare("SELECT COUNT(*) FROM sessions WHERE expires <= ?").pluck().get(Date.now()), 0);
});

test("el limitador desbloquea al terminar el bloqueo", () => {
  const limiter = createRateLimiter({ max: 2, windowMs: 1000, blockMs: 5000 });
  limiter.hit("k", 0);
  limiter.hit("k", 10);
  assert.throws(() => limiter.check("k", 20), { status: 429 });
  assert.doesNotThrow(() => limiter.check("k", 5011));
});

test("solo el administrador modifica los datos de la iglesia; los demás roles reciben 403", async () => {
  const password = "clave-tesorero-segura";
  await adminReq("users", { name: "Tesorera", email: "tes@example.org", password, role: "tesorero" });
  const treasurer = createClient(server);
  await treasurer("login", { email: "tes@example.org", password });
  assert.equal((await treasurer("settings")).status, 200, "puede consultar");
  assert.equal((await treasurer("settings", { name: "Otra iglesia" })).status, 403);
  assert.equal((await treasurer("users")).status, 403);
  assert.equal((await treasurer("users", { name: "X", email: "x@example.org", password, role: "administrador" })).status, 403);
  assert.equal((await treasurer("members", { name: "X", joined: "2026-01-01" })).status, 403);
  assert.equal((await adminReq("settings")).body[0].name !== "Otra iglesia", true);
});

test("rechaza teléfonos con letras en miembros y en los datos de la iglesia", async () => {
  for (const phone of ["9991081616SADASDASD", "abc", "12", "<script>"]) {
    assert.equal((await adminReq("settings", { name: "Iglesia", phone })).status, 400, phone);
    assert.equal((await adminReq("members", { name: "Ana", joined: "2026-01-01", phone })).status, 400, phone);
  }
  for (const phone of ["9991081616", "+52 (999) 108-1616", "999.108.16.16", ""])
    assert.equal((await adminReq("members", { name: "Ana", joined: "2026-01-01", phone })).status, 200, phone);
});
