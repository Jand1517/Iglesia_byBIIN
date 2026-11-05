const { db } = require("../connection");

const sessionsRepository = {
  create: (token, userId, expires) =>
    db
      .prepare("INSERT INTO sessions (token, user_id, expires) VALUES (?, ?, ?)")
      .run(token, userId, expires),

  /** Devuelve el usuario dueño de una sesión vigente (sin hash). */
  findActiveUser: (token, now) =>
    db
      .prepare(
        "SELECT u.id,u.name,u.email,u.role FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires>?",
      )
      .get(token, now),

  deleteByToken: (token) =>
    db.prepare("DELETE FROM sessions WHERE token=?").run(token),

  deleteByUser: (userId) =>
    db.prepare("DELETE FROM sessions WHERE user_id=?").run(userId),
};

module.exports = { sessionsRepository };
