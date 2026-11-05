/**
 * Manejador HTTP principal: arma el contexto de la solicitud, decide entre
 * archivos estáticos y API, y convierte los errores en respuestas JSON.
 */
const { readJsonBody } = require("./http/request");
const { sendJson } = require("./http/response");
const { serveStatic } = require("./http/static");
const { routeApi } = require("./routes");

async function handleRequest(req, res) {
  try {
    const url = new URL(req.url, "http://localhost");
    const ctx = {
      req,
      res,
      url,
      path: url.pathname,
      body: await readJsonBody(req),
      user: null,
      token: null,
    };

    if (!ctx.path.startsWith("/api/")) return serveStatic(res, ctx.path);
    await routeApi(ctx);
  } catch (error) {
    if (!error.status) console.error(error);
    sendJson(res, error.status || 500, {
      error: error.status ? error.message : "Error interno del servidor",
    });
  }
}

module.exports = { handleRequest };
