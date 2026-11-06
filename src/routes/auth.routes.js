/**
 * RF-01: configuración inicial, inicio/cierre de sesión y recuperación de
 * contraseña.
 */
const { env } = require("../config/env");
const { usersRepository } = require("../database/repositories/users.repository");
const { sessionsRepository } = require("../database/repositories/sessions.repository");
const { resetsRepository } = require("../database/repositories/resets.repository");
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
const { limiters } = require("../services/rate-limiter");
const { clientIp } = require("../http/request");

const RESET_TTL_MS = 30 * 60 * 1000;

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
    email: body.email.trim().toLowerCase(),
    name: body.name.trim(),
    role: body.role,
    hash: hashPassword(body.password),
  });
  sendJson(res, 201, { ok: true });
}

/**
 * Inicio de sesión.
 *   · Límite de intentos por IP+correo y por IP (se revisa ANTES de verificar
 *     la contraseña, así un bloqueo no da pistas sobre si era correcta).
 *   · Tiempo constante: siempre se ejecuta scrypt, exista o no la cuenta.
 */
function login({ req, res, body }) {
  const email = String(body.email).trim().toLowerCase();
  const ip = clientIp(req);
  const accountKey = ip + "|" + email;
  limiters.loginIp.check(ip);
  limiters.loginAccount.check(accountKey);

  const user = usersRepository.findByEmail(email);
  const passwordOk = verifyPassword(String(body.password), user?.hash);
  if (!user || !user.active || !passwordOk) {
    limiters.loginIp.hit(ip);
    limiters.loginAccount.hit(accountKey);
    fail(401, "Correo o contraseña incorrectos");
  }
  // El contador por IP no se reinicia: una cuenta válida no debe servir para
  // seguir probando contraseñas de otras.
  limiters.loginAccount.reset(accountKey);
  sessionsRepository.deleteExpired(Date.now());

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
 * misma, y llega igual de rápido, exista o no el correo: el envío ocurre en
 * segundo plano para que el tiempo del SMTP no revele qué cuentas existen.
 */
function recover({ req, res, body }) {
  if (!env.devRecovery() && !env.smtpConfigured())
    fail(503, "La recuperación por correo no está configurada.");
  const ip = clientIp(req);
  limiters.recoverIp.check(ip);
  limiters.recoverIp.hit(ip);

  const user = usersRepository.findByEmail(String(body.email).trim().toLowerCase());
  let token;
  if (user?.active) {
    token = newToken();
    resetsRepository.deleteByUser(user.id);
    resetsRepository.create(token, user.id, Date.now() + RESET_TTL_MS);
    if (!env.devRecovery())
      sendRecoveryEmail(user.email, token).catch(() => {
        // El error ya quedó registrado en mail.service; el código no se envió,
        // así que se invalida.
        resetsRepository.deleteByUser(user.id);
      });
  }
  sendJson(res, 200, {
    message: "Si el correo existe, se ha solicitado el restablecimiento.",
    ...(env.devRecovery() && token ? { token } : {}),
  });
}

/** Cambia la contraseña con un código válido y cierra todas las sesiones. */
function reset({ req, res, body }) {
  const ip = clientIp(req);
  limiters.resetIp.check(ip);
  const pending = resetsRepository.findValid(String(body.token), Date.now());
  if (!pending || !usersRepository.findById(pending.user_id)?.active) {
    limiters.resetIp.hit(ip);
    fail(400, "Código inválido o vencido");
  }
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

// Cerrar sesión cambia estado: solo POST, para que un enlace o una imagen
// (`<img src="/api/logout">`) no puedan cerrar la sesión de nadie.
const sessionRoutes = [
  { method: "POST", path: "/api/logout", handler: logout },
  { method: "GET", path: "/api/me", handler: me },
];

module.exports = { publicRoutes, sessionRoutes };
