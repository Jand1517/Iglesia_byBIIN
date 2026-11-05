/** Hash de contraseñas con scrypt y generación de identificadores/tokens. */
const crypto = require("node:crypto");

const KEY_LENGTH = 64;

/** Devuelve `sal:hash` en hexadecimal. */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return salt + ":" + crypto.scryptSync(password, salt, KEY_LENGTH).toString("hex");
}

/** Compara en tiempo constante la contraseña contra un `sal:hash`. */
function verifyPassword(password, stored) {
  const [salt, expected] = stored.split(":");
  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    crypto.scryptSync(password, salt, KEY_LENGTH),
  );
}

const newId = () => crypto.randomUUID();
const newToken = () => crypto.randomBytes(32).toString("hex");

module.exports = { hashPassword, verifyPassword, newId, newToken };
