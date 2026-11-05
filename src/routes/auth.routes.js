/**
 * RF-01: configuración inicial, inicio/cierre de sesión y recuperación de
 * contraseña.
 */
const { env } = require("../config/env");
const { usersRepository } = require("../database/repositories/users.repository");
const { sessionsRepository } = require("../database/repositories/sessions.repository");
const { resetsRepository } = require("../database/repositories/resets.repository");
const { recordsRepository } = require("../database/repositories/records.repository");
const { fail } = require("../http/errors");
const {
  sendJson,
  setSessionCookie,
  clearSessionCookie,
  SESSION_MAX_AGE_SECONDS,
} = require("../http/response");
const {
  hashPassword,
  verifyPassword,
  newId,
  newToken,
} = require("../services/password.service");
const { sendRecoveryEmail } = require("../services/mail.service");
const { validateUser, validateNewPassword } = require("../validators/user.validator");

const RESET_TTL_MS = 30 * 60 * 1000;

const DEFAULT_SETTINGS = {
  id: "church",
  name: "Mi iglesia",
  address: "",
  phone: "",
  email: "",
  schedule: "",
};

/** Indica si falta crear el primer administrador. */
function status({ res }) {
  sendJson(res, 200, { setup: usersRepository.count() === 0 });
}

/** Crea el primer administrador; solo funciona con la base vacía. */
function setup({ res, body }) {
  if (usersRepository.count()) fail(409, "El sistema ya está configurado");
  body.role = "administrador";
  validateUser(body);
  usersRepository.create({
    id: newId(),
    email: body.email.toLowerCase(),
    name: body.name,
    role: body.role,
    hash: hashPassword(body.password),
  });
  recordsRepository.save("settings", { ...DEFAULT_SETTINGS });
  sendJson(res, 201, { ok: true });
}

function login({ res, body }) {
  const user = usersRepository.findByEmail(String(body.email).toLowerCase());
  if (!user || !verifyPassword(String(body.password), user.hash))
    fail(401, "Correo o contraseña incorrectos");
  const token = newToken();
  sessionsRepository.create(
    token,
    user.id,
    Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  );
  setSessionCookie(res, token);
  sendJson(res, 200, { ok: true });
}

/**
 * Genera un código de recuperación y lo envía por correo. La respuesta es la
 * misma exista o no el correo, para no revelar qué cuentas están registradas.
 */
async function recover({ res, body }) {
  if (!env.devRecovery() && !env.smtpConfigured())
    fail(503, "La recuperación por correo no está configurada.");

  const user = usersRepository.findByEmail(String(body.email).toLowerCase());
  let token;
  if (user) {
    token = newToken();
    resetsRepository.deleteByUser(user.id);
    resetsRepository.create(token, user.id, Date.now() + RESET_TTL_MS);
    if (!env.devRecovery()) {
      try {
        await sendRecoveryEmail(user.email, token);
      } catch (error) {
        resetsRepository.deleteByUser(user.id);
        throw error;
      }
    }
  }
  sendJson(res, 200, {
    message: "Si el correo existe, se ha solicitado el restablecimiento.",
    ...(env.devRecovery() && token ? { token } : {}),
  });
}

/** Cambia la contraseña con un código válido y cierra todas las sesiones. */
function reset({ res, body }) {
  const pending = resetsRepository.findValid(String(body.token), Date.now());
  if (!pending) fail(400, "Código inválido o vencido");
  validateNewPassword(body.password);
  usersRepository.updatePasswordHash(pending.user_id, hashPassword(body.password));
  resetsRepository.deleteByUser(pending.user_id);
  sessionsRepository.deleteByUser(pending.user_id);
  sendJson(res, 200, { ok: true });
}

function logout({ res, token }) {
  sessionsRepository.deleteByToken(token);
  clearSessionCookie(res);
  sendJson(res, 200, { ok: true });
}

function me({ res, user }) {
  sendJson(res, 200, user);
}

/** `method: null` acepta cualquier método HTTP. */
const publicRoutes = [
  { method: null, path: "/api/status", handler: status },
  { method: "POST", path: "/api/setup", handler: setup },
  { method: "POST", path: "/api/login", handler: login },
  { method: "POST", path: "/api/recover", handler: recover },
  { method: "POST", path: "/api/reset", handler: reset },
];

const sessionRoutes = [
  { method: null, path: "/api/logout", handler: logout },
  { method: null, path: "/api/me", handler: me },
];

module.exports = { publicRoutes, sessionRoutes };
