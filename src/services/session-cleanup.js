/** Limpieza periódica de sesiones y códigos de recuperación vencidos. */
const { sessionsRepository } = require("../database/repositories/sessions.repository");
const { resetsRepository } = require("../database/repositories/resets.repository");

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // cada hora

function cleanupExpired(now = Date.now()) {
  return {
    sessions: sessionsRepository.deleteExpired(now),
    resets: resetsRepository.deleteExpired(now),
  };
}

/** Limpia al iniciar y luego cada hora. `unref` no impide cerrar el proceso. */
function startSessionCleanup() {
  cleanupExpired();
  setInterval(cleanupExpired, CLEANUP_INTERVAL_MS).unref();
}

module.exports = { cleanupExpired, startSessionCleanup };
