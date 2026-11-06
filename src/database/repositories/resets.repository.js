/**
 * Códigos de recuperación de contraseña (un solo uso). Igual que las
 * sesiones, la base guarda solo el hash SHA-256 del código.
 */
const { db } = require("../connection");
const { hashToken } = require("../../services/password.service");

const statements = {
  create: db.prepare("INSERT INTO resets (token_hash, user_id, expires) VALUES (?, ?, ?)"),
  findValid: db.prepare("SELECT user_id, expires FROM resets WHERE token_hash = ? AND expires > ?"),
  deleteByUser: db.prepare("DELETE FROM resets WHERE user_id = ?"),
  deleteExpired: db.prepare("DELETE FROM resets WHERE expires <= ?"),
};

const resetsRepository = {
  create: (token, userId, expires) => statements.create.run(hashToken(token), userId, expires),
  findValid: (token, now) => statements.findValid.get(hashToken(token), now),
  deleteByUser: (userId) => statements.deleteByUser.run(userId),
  deleteExpired: (now) => statements.deleteExpired.run(now).changes,
};

module.exports = { resetsRepository };
