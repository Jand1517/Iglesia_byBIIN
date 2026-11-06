/**
 * Sesiones. La cookie lleva el token; la base solo guarda su hash SHA-256.
 * Todas las funciones reciben el token tal cual y lo convierten aquí.
 */
const { db } = require("../connection");
const { hashToken } = require("../../services/password.service");

const statements = {
  create: db.prepare("INSERT INTO sessions (token_hash, user_id, expires) VALUES (?, ?, ?)"),
  findActiveUser: db.prepare(
    "SELECT u.id, u.name, u.email, u.role FROM users u JOIN sessions s ON s.user_id = u.id WHERE s.token_hash = ? AND s.expires > ? AND u.active = 1",
  ),
  deleteByToken: db.prepare("DELETE FROM sessions WHERE token_hash = ?"),
  deleteByUser: db.prepare("DELETE FROM sessions WHERE user_id = ?"),
  deleteExpired: db.prepare("DELETE FROM sessions WHERE expires <= ?"),
};

const sessionsRepository = {
  create: (token, userId, expires) => statements.create.run(hashToken(token), userId, expires),

  /** Usuario dueño de una sesión vigente (sin hash de contraseña). */
  findActiveUser: (token, now) => statements.findActiveUser.get(hashToken(token), now),

  deleteByToken: (token) => statements.deleteByToken.run(hashToken(token)),
  deleteByUser: (userId) => statements.deleteByUser.run(userId),

  /** Borra las sesiones vencidas; devuelve cuántas eliminó. */
  deleteExpired: (now) => statements.deleteExpired.run(now).changes,
};

module.exports = { sessionsRepository };
