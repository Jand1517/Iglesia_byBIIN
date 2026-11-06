/** Punto de entrada: crea el servidor HTTP y lo inicia si se ejecuta directo. */
const http = require("node:http");
const { env } = require("./config/env");
const { db } = require("./database/connection");
const { handleRequest } = require("./app");
const { startSessionCleanup } = require("./services/session-cleanup");

const server = http.createServer(handleRequest);

if (require.main === module) {
  startSessionCleanup();
  const port = env.port();
  server.listen(port, "127.0.0.1", () =>
    console.log("Iglesia: http://localhost:" + port),
  );
}

module.exports = { server, db };
