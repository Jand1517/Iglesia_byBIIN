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

/**
 * Traduce violaciones de reglas de SQLite (CHECK, FOREIGN KEY, UNIQUE, NOT
 * NULL) a errores 400/409. Los validadores deberían detectarlas antes; si
 * llegan hasta aquí, la base de datos actuó como última defensa.
 */
function fromDatabaseError(error) {
  if (typeof error?.code !== "string" || !error.code.startsWith("SQLITE_CONSTRAINT"))
    return null;
  if (error.code === "SQLITE_CONSTRAINT_UNIQUE" || error.code === "SQLITE_CONSTRAINT_PRIMARYKEY")
    return new HttpError(409, "El registro ya existe");
  if (error.code === "SQLITE_CONSTRAINT_FOREIGNKEY")
    return new HttpError(400, "El registro hace referencia a datos que no existen");
  return new HttpError(400, "Los datos no cumplen las reglas del sistema");
}

module.exports = { HttpError, fail, fromDatabaseError };
