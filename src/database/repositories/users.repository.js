const { db } = require("../connection");

const usersRepository = {
  count: () => db.prepare("SELECT COUNT(*) n FROM users").get().n,

  findByEmail: (email) =>
    db.prepare("SELECT * FROM users WHERE email=?").get(email),

  /** Lista pública: nunca incluye el hash de la contraseña. */
  listPublic: () => db.prepare("SELECT id,name,email,role,active FROM users ORDER BY name COLLATE NOCASE").all()
    .map((row) => ({ ...row, active: Boolean(row.active) })),

  findById: (id) => db.prepare("SELECT id,name,email,role,active FROM users WHERE id=?").get(id),

  countActiveAdmins: () => db.prepare("SELECT COUNT(*) n FROM users WHERE role='administrador' AND active=1").get().n,

  update: ({ id, name, email, role, active }) =>
    db.prepare("UPDATE users SET name=?,email=?,role=?,active=? WHERE id=?")
      .run(name, email, role, Number(active), id),

  delete: (id) => db.prepare("DELETE FROM users WHERE id=?").run(id),

  create: ({ id, email, name, role, hash }) =>
    db
      .prepare("INSERT INTO users (id, email, name, role, hash) VALUES (?, ?, ?, ?, ?)")
      .run(id, email, name, role, hash),

  updatePasswordHash: (userId, hash) =>
    db.prepare("UPDATE users SET hash=? WHERE id=?").run(hash, userId),
};

module.exports = { usersRepository };
