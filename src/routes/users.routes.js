/** RF-01: administración de cuentas (solo administrador). */
const { db } = require("../database/connection");
const { usersRepository } = require("../database/repositories/users.repository");
const { sessionsRepository } = require("../database/repositories/sessions.repository");
const { resetsRepository } = require("../database/repositories/resets.repository");
const { fail } = require("../http/errors");
const { sendJson } = require("../http/response");
const { hashPassword, newId } = require("../services/password.service");
const { validateUser } = require("../validators/user.validator");

function users({ req, res, body, user }) {
  if (user.role !== "administrador") fail(403, "Acceso restringido");

  if (req.method === "GET") return sendJson(res, 200, usersRepository.listPublic());

  if (req.method === "POST") {
    validateUser(body);
    const email = body.email.trim().toLowerCase();
    if (usersRepository.findByEmail(email))
      fail(409, "El correo ya está registrado");
    usersRepository.create({
      id: newId(),
      email,
      name: body.name.trim(),
      role: body.role,
      hash: hashPassword(body.password),
    });
    return sendJson(res, 201, { ok: true });
  }

  if (["PUT", "PATCH", "DELETE"].includes(req.method)) {
    if (typeof body.id !== "string" || !body.id) fail(400, "Selecciona un usuario");
    db.transaction(() => {
      const current = usersRepository.findById(body.id);
      if (!current) fail(404, "Usuario no encontrado");
      const next = { ...current, active: Boolean(current.active) };
      if (req.method === "PUT") {
        validateUser(body, { editing: true });
        Object.assign(next, { name: body.name.trim(), email: body.email.trim().toLowerCase(), role: body.role });
        const duplicate = usersRepository.findByEmail(next.email);
        if (duplicate && duplicate.id !== current.id) fail(409, "El correo ya está registrado");
      }
      if (req.method === "PATCH") {
        if (typeof body.active !== "boolean") fail(400, "El estado debe ser activo o inactivo");
        next.active = body.active;
      }
      const removingAccess = req.method === "DELETE" || !next.active || next.role !== current.role;
      if (current.id === user.id && removingAccess)
        fail(409, "No puedes eliminar o desactivar tu propia cuenta ni cambiar tu propio rol");
      if (current.active && current.role === "administrador" &&
          (req.method === "DELETE" || !next.active || next.role !== "administrador") &&
          usersRepository.countActiveAdmins() <= 1)
        fail(409, "Debe permanecer al menos un administrador activo");

      if (req.method === "DELETE") usersRepository.delete(current.id);
      else usersRepository.update(next);
      if (removingAccess) {
        sessionsRepository.deleteByUser(current.id);
        resetsRepository.deleteByUser(current.id);
      }
    })();
    return sendJson(res, 200, { ok: true });
  }

  fail(405, "Método no permitido");
}

const userRoutes = [{ method: null, path: "/api/users", handler: users }];

module.exports = { userRoutes };
