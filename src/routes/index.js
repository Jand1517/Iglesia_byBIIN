/**
 * Enrutador de la API. Orden de resolución:
 *   1. Rutas públicas (sin sesión).
 *   2. Autenticación y verificación de origen.
 *   3. Rutas con sesión, usuarios y, por último, el CRUD de módulos.
 */
const { authenticate } = require("../middleware/authenticate");
const { verifyOrigin } = require("../middleware/verify-origin");
const { publicRoutes, sessionRoutes } = require("./auth.routes");
const { userRoutes } = require("./users.routes");
const { handleRecords } = require("./records.routes");

const findRoute = (routes, method, path) =>
  routes.find((r) => r.path === path && (!r.method || r.method === method));

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
