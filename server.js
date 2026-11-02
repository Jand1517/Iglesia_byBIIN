const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");
const nodemailer = require("nodemailer");
fs.mkdirSync(path.join(__dirname, "data"), { recursive: true });
const db = new DatabaseSync(
  process.env.DB_PATH || path.join(__dirname, "data", "church.sqlite"),
);
db.exec(
  `PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE,name TEXT,role TEXT,hash TEXT); CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT,expires INTEGER); CREATE TABLE IF NOT EXISTS resets(token TEXT PRIMARY KEY,user_id TEXT,expires INTEGER); CREATE TABLE IF NOT EXISTS records(kind TEXT,id TEXT,data TEXT,PRIMARY KEY(kind,id));`,
);
const roles = [
  "administrador",
  "pastor",
  "secretario",
  "tesorero",
  "coordinador",
];
const rights = {
  members: ["administrador", "pastor", "secretario"],
  events: ["administrador", "pastor", "secretario", "coordinador"],
  attendance: ["administrador", "pastor", "secretario", "coordinador"],
  ministries: ["administrador", "pastor", "secretario", "coordinador"],
  donations: ["administrador", "tesorero"],
  announcements: ["administrador", "pastor", "secretario"],
  settings: ["administrador"],
};
const id = () => crypto.randomUUID();
function hash(p) {
  const salt = crypto.randomBytes(16).toString("hex");
  return salt + ":" + crypto.scryptSync(p, salt, 64).toString("hex");
}
function verify(p, h) {
  const [s, v] = h.split(":");
  return crypto.timingSafeEqual(
    Buffer.from(v, "hex"),
    crypto.scryptSync(p, s, 64),
  );
}
function records(k) {
  return db
    .prepare("SELECT data FROM records WHERE kind=?")
    .all(k)
    .map((r) => JSON.parse(r.data));
}
function save(k, v) {
  db.prepare("INSERT OR REPLACE INTO records VALUES(?,?,?)").run(
    k,
    v.id,
    JSON.stringify(v),
  );
  return v;
}
function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}
function validUser(b) {
  if (
    !b.name?.trim() ||
    !/^\S+@\S+\.\S+$/.test(b.email || "") ||
    !b.password ||
    b.password.length < 10 ||
    !roles.includes(b.role)
  )
    fail(
      400,
      "Nombre, correo válido, rol y contraseña de al menos 10 caracteres requeridos.",
    );
}
function validate(k, b) {
  const required = {
    members: ["name", "joined"],
    events: ["title", "date", "time", "place"],
    ministries: ["name", "coordinator"],
    donations: ["date", "amount", "concept", "method"],
    announcements: ["title", "body", "date"],
    attendance: ["event", "date"],
    settings: ["name"],
  }[k];
  for (const f of required)
    if (b[f] === undefined || String(b[f]).trim() === "")
      fail(400, "Completa el campo " + f);
  if (k === "members" && b.email && !/^\S+@\S+\.\S+$/.test(b.email))
    fail(400, "Correo inválido");
  if (
    k === "donations" &&
    (!Number.isFinite(Number(b.amount)) || Number(b.amount) <= 0)
  )
    fail(400, "El monto debe ser mayor que cero");
  if (k === "announcements") b.important = b.important === true;
  if (k === "attendance") {
    if (!records("events").some((e) => e.id === b.event))
      fail(400, "Evento inválido");
    if (
      records(k).some(
        (x) => x.event === b.event && x.date === b.date && x.id !== b.id,
      )
    )
      fail(409, "Ya existe asistencia para ese evento y fecha");
    const ids = new Set(records("members").map((m) => m.id));
    if (!Array.isArray(b.present) || b.present.some((x) => !ids.has(x)))
      fail(400, "Miembros inválidos");
    b.roster =
      records(k).find((x) => x.id === b.id)?.roster ||
      records("members")
        .filter((m) => m.active !== false)
        .map((m) => m.id);
  }
}
async function sendRecoveryEmail(to, token) {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM } =
    process.env;
  if (!SMTP_HOST || !SMTP_FROM)
    fail(503, "La recuperación por correo no está configurada.");

  const port = Number(SMTP_PORT || 587);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    fail(500, "La configuración del correo no es válida.");

  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: SMTP_SECURE === "1",
    ...(SMTP_USER && SMTP_PASS
      ? { auth: { user: SMTP_USER, pass: SMTP_PASS } }
      : {}),
  });

  try {
    await transport.sendMail({
      from: SMTP_FROM,
      to,
      subject: "Código para restablecer tu contraseña",
      text: `Tu código para restablecer la contraseña es:\n\n${token}\n\nEl código vence en 30 minutos. Si no solicitaste este cambio, ignora este correo.`,
    });
  } catch (error) {
    console.error(
      "No se pudo enviar el correo de recuperación:",
      error.message,
    );
    fail(502, "No se pudo enviar el correo. Inténtalo más tarde.");
  } finally {
    transport.close();
  }
}
async function handler(req, res) {
  const json = (s, v) => {
    res.writeHead(s, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(v));
  };
  try {
    const url = new URL(req.url, "http://localhost"),
      p = url.pathname;
    let b = {};
    if (["POST", "PUT", "DELETE"].includes(req.method)) {
      let raw = "";
      for await (const c of req) {
        raw += c;
        if (raw.length > 2000000) fail(413, "Solicitud demasiado grande");
      }
      try {
        b = JSON.parse(raw || "{}");
      } catch {
        fail(400, "JSON inválido");
      }
    }
    if (!p.startsWith("/api/")) {
      const file = {
        "/": "index.html",
        "/app.js": "app.js",
        "/style.css": "style.css",
      }[p];
      if (!file) fail(404, "No encontrado");
      res.writeHead(200, {
        "Content-Type": file.endsWith(".js")
          ? "text/javascript; charset=utf-8"
          : file.endsWith(".css")
            ? "text/css"
            : "text/html; charset=utf-8",
        "Content-Security-Policy":
          "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'",
        "X-Content-Type-Options": "nosniff",
      });
      return res.end(fs.readFileSync(path.join(__dirname, "public", file)));
    }
    const count = db.prepare("SELECT COUNT(*) n FROM users").get().n;
    if (p === "/api/status") return json(200, { setup: count === 0 });
    if (p === "/api/setup" && req.method === "POST") {
      if (count) fail(409, "El sistema ya está configurado");
      b.role = "administrador";
      validUser(b);
      db.prepare("INSERT INTO users VALUES(?,?,?,?,?)").run(
        id(),
        b.email.toLowerCase(),
        b.name,
        b.role,
        hash(b.password),
      );
      save("settings", {
        id: "church",
        name: "Mi iglesia",
        address: "",
        phone: "",
        email: "",
        schedule: "",
      });
      return json(201, { ok: true });
    }
    if (p === "/api/login" && req.method === "POST") {
      const u = db
        .prepare("SELECT * FROM users WHERE email=?")
        .get(String(b.email).toLowerCase());
      if (!u || !verify(String(b.password), u.hash))
        fail(401, "Correo o contraseña incorrectos");
      const token = crypto.randomBytes(32).toString("hex");
      db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
        token,
        u.id,
        Date.now() + 8 * 3600000,
      );
      res.setHeader(
        "Set-Cookie",
        `session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.COOKIE_SECURE === "1" ? "; Secure" : ""}`,
      );
      return json(200, { ok: true });
    }
    if (p === "/api/recover" && req.method === "POST") {
      if (
        process.env.DEV_RECOVERY !== "1" &&
        (!process.env.SMTP_HOST || !process.env.SMTP_FROM)
      )
        fail(503, "La recuperación por correo no está configurada.");
      const u = db
        .prepare("SELECT * FROM users WHERE email=?")
        .get(String(b.email).toLowerCase());
      let token;
      if (u) {
        token = crypto.randomBytes(32).toString("hex");
        db.prepare("DELETE FROM resets WHERE user_id=?").run(u.id);
        db.prepare("INSERT INTO resets VALUES(?,?,?)").run(
          token,
          u.id,
          Date.now() + 1800000,
        );
        if (process.env.DEV_RECOVERY !== "1") {
          try {
            await sendRecoveryEmail(u.email, token);
          } catch (error) {
            db.prepare("DELETE FROM resets WHERE user_id=?").run(u.id);
            throw error;
          }
        }
      }
      return json(200, {
        message: "Si el correo existe, se ha solicitado el restablecimiento.",
        ...(process.env.DEV_RECOVERY === "1" && token ? { token } : {}),
      });
    }
    if (p === "/api/reset" && req.method === "POST") {
      const r = db
        .prepare("SELECT * FROM resets WHERE token=? AND expires>?")
        .get(String(b.token), Date.now());
      if (!r) fail(400, "Código inválido o vencido");
      if (!b.password || b.password.length < 10)
        fail(400, "Usa al menos 10 caracteres");
      db.prepare("UPDATE users SET hash=? WHERE id=?").run(
        hash(b.password),
        r.user_id,
      );
      db.prepare("DELETE FROM resets WHERE user_id=?").run(r.user_id);
      db.prepare("DELETE FROM sessions WHERE user_id=?").run(r.user_id);
      return json(200, { ok: true });
    }
    const token = /session=([a-f0-9]+)/.exec(req.headers.cookie || "")?.[1];
    const u = db
      .prepare(
        "SELECT u.id,u.name,u.email,u.role FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires>?",
      )
      .get(token || "", Date.now());
    if (!u) fail(401, "Inicia sesión");
    if (
      req.method !== "GET" &&
      req.headers.origin &&
      req.headers.origin !== url.protocol + "//" + req.headers.host
    )
      fail(403, "Origen inválido");
    if (p === "/api/logout") {
      db.prepare("DELETE FROM sessions WHERE token=?").run(token);
      res.setHeader(
        "Set-Cookie",
        "session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
      );
      return json(200, { ok: true });
    }
    if (p === "/api/me") return json(200, u);
    if (p === "/api/users") {
      if (u.role !== "administrador") fail(403, "Acceso restringido");
      if (req.method === "GET")
        return json(
          200,
          db.prepare("SELECT id,name,email,role FROM users").all(),
        );
      if (req.method === "POST") {
        validUser(b);
        if (
          db
            .prepare("SELECT id FROM users WHERE email=?")
            .get(b.email.toLowerCase())
        )
          fail(409, "El correo ya está registrado");
        db.prepare("INSERT INTO users VALUES(?,?,?,?,?)").run(
          id(),
          b.email.toLowerCase(),
          b.name,
          b.role,
          hash(b.password),
        );
        return json(201, { ok: true });
      }
      fail(405, "Método no permitido");
    }
    const k = p.split("/")[2];
    if (!rights[k]) fail(404, "Recurso desconocido");
    if (k === "donations" && !rights[k].includes(u.role))
      fail(403, "Información financiera restringida");
    if (req.method === "GET") return json(200, records(k));
    if (!rights[k].includes(u.role))
      fail(403, "Tu rol no permite modificar este módulo");
    if (req.method === "POST" || req.method === "PUT") {
      b.id = b.id || id();
      validate(k, b);
      return json(200, save(k, b));
    }
    if (req.method === "DELETE") {
      if (!["announcements"].includes(k))
        fail(
          405,
          "Usa desactivación o cancelación para conservar el historial",
        );
      db.prepare("DELETE FROM records WHERE kind=? AND id=?").run(k, b.id);
      return json(200, { ok: true });
    }
    fail(405, "Método no permitido");
  } catch (e) {
    json(e.status || 500, {
      error: e.status ? e.message : "Error interno del servidor",
    });
  }
}
const server = http.createServer(handler);
if (require.main === module)
  server.listen(process.env.PORT || 3000, "127.0.0.1", () =>
    console.log("Iglesia: http://localhost:" + (process.env.PORT || 3000)),
  );
module.exports = { server, db };
