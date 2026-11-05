const { db } = require("../connection");

/** Códigos de recuperación de contraseña (un solo uso). */
const resetsRepository = {
  create: (token, userId, expires) =>
    db.prepare("INSERT INTO resets VALUES(?,?,?)").run(token, userId, expires),

  findValid: (token, now) =>
    db
      .prepare("SELECT * FROM resets WHERE token=? AND expires>?")
      .get(token, now),

  deleteByUser: (userId) =>
    db.prepare("DELETE FROM resets WHERE user_id=?").run(userId),
};

module.exports = { resetsRepository };
