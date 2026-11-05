/** Entrega de archivos estáticos de /public con cabeceras de seguridad. */
const fs = require("node:fs");
const path = require("node:path");
const { PUBLIC_DIR } = require("../config/env");
const { fail } = require("./errors");

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

const SECURITY_HEADERS = {
  "Content-Security-Policy":
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
};

/** Resuelve la ruta pedida dentro de PUBLIC_DIR; impide salir de la carpeta. */
function resolvePublicFile(pathname) {
  // Solo se expone este bundle, nunca node_modules completo.
  if (pathname === "/vendor/exceljs.min.js")
    return { file: require.resolve("exceljs/dist/exceljs.min.js"), type: CONTENT_TYPES[".js"] };
  const relative = pathname === "/" ? "index.html" : pathname.slice(1);
  const file = path.resolve(PUBLIC_DIR, relative);
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return null;
  const type = CONTENT_TYPES[path.extname(file)];
  if (!type || !fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
  return { file, type };
}

function safeDecode(pathname) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return null;
  }
}

function serveStatic(res, pathname) {
  const decoded = safeDecode(pathname);
  const target = decoded && resolvePublicFile(decoded);
  if (!target) fail(404, "No encontrado");
  res.writeHead(200, { "Content-Type": target.type, ...SECURITY_HEADERS });
  res.end(fs.readFileSync(target.file));
}

module.exports = { serveStatic };
