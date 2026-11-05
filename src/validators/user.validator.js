const { ROLES } = require("../config/permissions");
const { fail } = require("../http/errors");

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const MIN_PASSWORD_LENGTH = 10;

function validateUser(body, { editing = false } = {}) {
  if (
    typeof body.name !== "string" || !body.name.trim() ||
    typeof body.email !== "string" || !EMAIL_PATTERN.test(body.email.trim()) ||
    (!editing && (typeof body.password !== "string" || body.password.length < MIN_PASSWORD_LENGTH)) ||
    !ROLES.includes(body.role)
  )
    fail(
      400,
      editing ? "Nombre, correo válido y rol requeridos." : "Nombre, correo válido, rol y contraseña de al menos 10 caracteres requeridos.",
    );
}

function validateNewPassword(password) {
  if (!password || password.length < MIN_PASSWORD_LENGTH)
    fail(400, "Usa al menos 10 caracteres");
}

module.exports = { validateUser, validateNewPassword, EMAIL_PATTERN };
