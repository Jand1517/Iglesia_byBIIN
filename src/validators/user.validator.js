const { ROLES } = require("../config/permissions");
const { fail } = require("../http/errors");

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const MIN_PASSWORD_LENGTH = 10;

function validateUser(body) {
  if (
    !body.name?.trim() ||
    !EMAIL_PATTERN.test(body.email || "") ||
    !body.password ||
    body.password.length < MIN_PASSWORD_LENGTH ||
    !ROLES.includes(body.role)
  )
    fail(
      400,
      "Nombre, correo válido, rol y contraseña de al menos 10 caracteres requeridos.",
    );
}

function validateNewPassword(password) {
  if (!password || password.length < MIN_PASSWORD_LENGTH)
    fail(400, "Usa al menos 10 caracteres");
}

module.exports = { validateUser, validateNewPassword, EMAIL_PATTERN };
