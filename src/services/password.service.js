/** Hash de contraseñas con scrypt y generación de identificadores/tokens. */
const crypto = require("node:crypto");

const KEY_LENGTH = 64;

/** Devuelve `sal:hash` en hexadecimal. */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return salt + ":" + crypto.scryptSync(password, salt, KEY_LENGTH).toString("hex");
}

/**
 * Hash ficticio con el mismo costo que uno real. Se verifica contra él cuando
 * el correo no existe, para que el login tarde lo mismo exista o no la cuenta
 * (si no, medir el tiempo revela qué correos están registrados).
 */
const DUMMY_HASH = hashPassword(crypto.randomBytes(16).toString("hex"));

/**
 * Compara en tiempo constante la contraseña contra un `sal:hash`.
 * Sin hash (cuenta inexistente) ejecuta el mismo trabajo y devuelve false.
 */
function verifyPassword(password, stored) {
  const [salt, expected] = (stored || DUMMY_HASH).split(":");
  const expectedBytes = Buffer.from(expected || "", "hex");
  const actual = crypto.scryptSync(String(password), salt || "", KEY_LENGTH);
  const matches =
    expectedBytes.length === actual.length && crypto.timingSafeEqual(expectedBytes, actual);
  return Boolean(stored) && matches;
}

const newId = () => crypto.randomUUID();
const newToken = () => crypto.randomBytes(32).toString("hex");

/**
 * Hash de un token de sesión o de recuperación para guardarlo en la base.
 * SHA-256 basta (no scrypt): el token ya es aleatorio de 256 bits.
 */
const hashToken = (token) => crypto.createHash("sha256").update(String(token)).digest("hex");

module.exports = { hashPassword, verifyPassword, newId, newToken, hashToken };
