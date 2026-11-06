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
  server.on("error", (error) => {
    if (error.code !== "EADDRINUSE") throw error;
    // Mensaje claro en lugar de la traza: casi siempre es otra copia abierta.
    console.error(
      `\nEl puerto ${port} ya está en uso: probablemente el sistema ya está abierto en otra terminal.\n` +
        `  · Para usar esa copia, abre http://localhost:${port}\n` +
        `  · Para cerrarla, ve a esa terminal y presiona Ctrl + C\n` +
        `  · Para usar otro puerto (PowerShell):  $env:PORT=3001; npm start\n`,
    );
    db.close();
    process.exit(1);
  });
  server.listen(port, "127.0.0.1", () =>
    console.log("Iglesia: http://localhost:" + port),
  );
}

module.exports = { server, db };
