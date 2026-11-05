const { sessionsRepository } = require("../database/repositories/sessions.repository");
const { getSessionToken } = require("../http/request");
const { fail } = require("../http/errors");

/**
 * Exige una sesión vigente. Agrega `ctx.user` y `ctx.token` al contexto.
 */
function authenticate(ctx) {
  const token = getSessionToken(ctx.req);
  const user = sessionsRepository.findActiveUser(token || "", Date.now());
  if (!user) fail(401, "Inicia sesión");
  ctx.user = user;
  ctx.token = token;
}

module.exports = { authenticate };
