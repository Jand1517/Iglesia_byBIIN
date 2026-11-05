const { fail } = require("./errors");

const MAX_BODY_LENGTH = 2_000_000;
const METHODS_WITH_BODY = ["POST", "PUT", "DELETE"];

/** Lee y parsea el cuerpo JSON; devuelve `{}` si el método no lleva cuerpo. */
async function readJsonBody(req) {
  if (!METHODS_WITH_BODY.includes(req.method)) return {};
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_BODY_LENGTH) fail(413, "Solicitud demasiado grande");
  }
  try {
    return JSON.parse(raw || "{}");
  } catch {
    fail(400, "JSON inválido");
  }
}

/** Token de sesión tomado de la cookie `session`. */
function getSessionToken(req) {
  return /session=([a-f0-9]+)/.exec(req.headers.cookie || "")?.[1];
}

module.exports = { readJsonBody, getSessionToken };
