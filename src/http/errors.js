/**
 * Error con código HTTP. Su mensaje se muestra al cliente; cualquier otro
 * error se responde como "Error interno del servidor".
 */
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Lanza un HttpError. Útil en validaciones de una sola línea. */
function fail(status, message) {
  throw new HttpError(status, message);
}

module.exports = { HttpError, fail };
