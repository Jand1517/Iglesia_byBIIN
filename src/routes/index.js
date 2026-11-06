/**
 * Enrutador de la API. Orden de resolución:
 *   1. Rutas públicas (sin sesión).
 *   2. Autenticación y verificación de origen.
 *   3. Rutas con sesión, usuarios y, por último, el CRUD de módulos.
 *
 * Si la ruta existe pero el método no corresponde, se responde 405.
 */
const { authenticate } = require("../middleware/authenticate");
const { verifyOrigin } = require("../middleware/verify-origin");
const { fail } = require("../http/errors");
const { publicRoutes, sessionRoutes } = require("./auth.routes");
const { userRoutes } = require("./users.routes");
const { handleRecords } = require("./records.routes");

/** Busca la ruta; lanza 405 si la ruta existe con otro método. */
function findRoute(routes, method, path) {
  const samePath = routes.filter((r) => r.path === path);
  if (!samePath.length) return null;
  const route = samePath.find((r) => !r.method || r.method === method);
  if (!route) fail(405, "Método no permitido");
  return route;
}

async function routeApi(ctx) {
  const publicRoute = findRoute(publicRoutes, ctx.req.method, ctx.path);
  if (publicRoute) return publicRoute.handler(ctx);

  authenticate(ctx);
  verifyOrigin(ctx);

  const route = findRoute(
    [...sessionRoutes, ...userRoutes],
    ctx.req.method,
    ctx.path,
  );
  if (route) return route.handler(ctx);

  return handleRecords(ctx);
}

module.exports = { routeApi };
