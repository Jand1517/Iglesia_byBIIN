const { db } = require("../connection");

const usersRepository = {
  count: () => db.prepare("SELECT COUNT(*) n FROM users").get().n,

  findByEmail: (email) =>
    db.prepare("SELECT * FROM users WHERE email=?").get(email),

  /** Lista pública: nunca incluye el hash de la contraseña. */
  listPublic: () => db.prepare("SELECT id,name,email,role FROM users").all(),

  create: ({ id, email, name, role, hash }) =>
    db
      .prepare("INSERT INTO users (id, email, name, role, hash) VALUES (?, ?, ?, ?, ?)")
      .run(id, email, name, role, hash),

  updatePasswordHash: (userId, hash) =>
    db.prepare("UPDATE users SET hash=? WHERE id=?").run(hash, userId),
};

module.exports = { usersRepository };
