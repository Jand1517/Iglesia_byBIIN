/** RF-01: alta y consulta de usuarios del sistema (solo administrador). */
const { usersRepository } = require("../database/repositories/users.repository");
const { fail } = require("../http/errors");
const { sendJson } = require("../http/response");
const { hashPassword, newId } = require("../services/password.service");
const { validateUser } = require("../validators/user.validator");

function users({ req, res, body, user }) {
  if (user.role !== "administrador") fail(403, "Acceso restringido");

  if (req.method === "GET") return sendJson(res, 200, usersRepository.listPublic());

  if (req.method === "POST") {
    validateUser(body);
    const email = body.email.toLowerCase();
    if (usersRepository.findByEmail(email))
      fail(409, "El correo ya está registrado");
    usersRepository.create({
      id: newId(),
      email,
      name: body.name,
      role: body.role,
      hash: hashPassword(body.password),
    });
    return sendJson(res, 201, { ok: true });
  }

  fail(405, "Método no permitido");
}

const userRoutes = [{ method: null, path: "/api/users", handler: users }];

module.exports = { userRoutes };
