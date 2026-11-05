const { fail } = require("../http/errors");

/**
 * Protección CSRF complementaria a SameSite=Strict: en solicitudes que
 * modifican datos, si el navegador envía `Origin` debe coincidir con el host.
 */
function verifyOrigin(ctx) {
  const { req, url } = ctx;
  if (
    req.method !== "GET" &&
    req.headers.origin &&
    req.headers.origin !== url.protocol + "//" + req.headers.host
  )
    fail(403, "Origen inválido");
}

module.exports = { verifyOrigin };
