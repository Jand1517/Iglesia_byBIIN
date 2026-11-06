/**
 * Límite de intentos en memoria (ventana fija + bloqueo temporal).
 *
 * Es suficiente para esta app: un solo proceso de Node. Si algún día corre
 * en varios procesos o servidores, el conteo debe moverse a un almacén
 * compartido (por ejemplo, una tabla o Redis).
 */
const { HttpError } = require("../http/errors");

const MAX_KEYS = 10_000; // evita que el mapa crezca sin límite

class TooManyAttemptsError extends HttpError {
  constructor(retryAfterMs) {
    const minutes = Math.max(1, Math.ceil(retryAfterMs / 60_000));
    super(429, `Demasiados intentos. Espera ${minutes} minuto${minutes === 1 ? "" : "s"} e inténtalo de nuevo.`);
    this.retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
  }
}

/**
 * @param {{ max: number, windowMs: number, blockMs: number }} options
 *   max      intentos permitidos dentro de la ventana
 *   windowMs duración de la ventana
 *   blockMs  duración del bloqueo al superar `max`
 */
function createRateLimiter({ max, windowMs, blockMs }) {
  const entries = new Map(); // key → { count, windowStart, blockedUntil }

  function prune(now) {
    for (const [key, e] of entries)
      if (e.blockedUntil <= now && now - e.windowStart >= windowMs) entries.delete(key);
  }

  return {
    /** Lanza 429 si la clave está bloqueada. No cuenta un intento. */
    check(key, now = Date.now()) {
      const entry = entries.get(key);
      if (entry && entry.blockedUntil > now) throw new TooManyAttemptsError(entry.blockedUntil - now);
    },

    /** Registra un intento fallido (o una solicitud, según la política). */
    hit(key, now = Date.now()) {
      if (entries.size > MAX_KEYS) prune(now);
      let entry = entries.get(key);
      if (!entry || now - entry.windowStart >= windowMs) {
        entry = { count: 0, windowStart: now, blockedUntil: 0 };
        entries.set(key, entry);
      }
      entry.count++;
      if (entry.count >= max) entry.blockedUntil = now + blockMs;
    },

    /** Olvida la clave (p. ej. tras un inicio de sesión correcto). */
    reset(key) {
      entries.delete(key);
    },

    /** Solo para pruebas. */
    clear() {
      entries.clear();
    },
  };
}

const MINUTE = 60_000;

/** Políticas de la aplicación. */
const limiters = {
  // 5 contraseñas incorrectas para el mismo correo desde la misma IP.
  loginAccount: createRateLimiter({ max: 5, windowMs: 15 * MINUTE, blockMs: 15 * MINUTE }),
  // 20 contraseñas incorrectas desde una IP (aunque se prueben correos distintos).
  loginIp: createRateLimiter({ max: 20, windowMs: 15 * MINUTE, blockMs: 15 * MINUTE }),
  // 5 solicitudes de recuperación por IP: evita llenar buzones de correos ajenos.
  recoverIp: createRateLimiter({ max: 5, windowMs: 15 * MINUTE, blockMs: 15 * MINUTE }),
  // 10 códigos de recuperación incorrectos por IP.
  resetIp: createRateLimiter({ max: 10, windowMs: 15 * MINUTE, blockMs: 15 * MINUTE }),
};

const clearAllLimiters = () => Object.values(limiters).forEach((l) => l.clear());

module.exports = { createRateLimiter, limiters, clearAllLimiters, TooManyAttemptsError };
