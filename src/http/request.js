const { fail } = require("./errors");

const MAX_BODY_LENGTH = 2_000_000;
const METHODS_WITH_BODY = ["POST", "PUT", "PATCH", "DELETE"];

/** Lee y parsea el cuerpo JSON; devuelve `{}` si el método no lleva cuerpo. */
async function readJsonBody(req) {
  if (!METHODS_WITH_BODY.includes(req.method)) return {};
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_BODY_LENGTH) fail(413, "Solicitud demasiado grande");
  }
  let body;
  try {
    body = JSON.parse(raw || "{}");
  } catch {
    fail(400, "JSON inválido");
  }
  // Todas las rutas esperan un objeto: `null`, listas, números o textos se
  // rechazan aquí para que ningún manejador falle con un error 500.
  if (body === null || typeof body !== "object" || Array.isArray(body))
    fail(400, "El cuerpo de la solicitud debe ser un objeto JSON");
  return body;
}

/** Token de sesión tomado de la cookie `session`. */
function getSessionToken(req) {
  return /session=([a-f0-9]+)/.exec(req.headers.cookie || "")?.[1];
}

/**
 * IP del cliente según la conexión TCP. No se usa X-Forwarded-For a
 * propósito: cualquiera puede falsificarlo. Si se publica detrás de un proxy,
 * hay que leer esa cabecera solo desde el proxy de confianza.
 */
const clientIp = (req) => req.socket.remoteAddress || "desconocida";

module.exports = { readJsonBody, getSessionToken, clientIp };
