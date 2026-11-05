/**
 * Lectura centralizada de variables de entorno.
 *
 * Se exponen como funciones (no constantes) a propósito: los valores se leen en
 * cada solicitud, de modo que cambiar `process.env` en caliente (por ejemplo en
 * las pruebas) surte efecto sin reiniciar el servidor.
 */
const path = require("node:path");

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");

const env = {
  port: () => process.env.PORT || 3000,
  dbPath: () => process.env.DB_PATH || path.join(DATA_DIR, "church.sqlite"),
  cookieSecure: () => process.env.COOKIE_SECURE === "1",
  devRecovery: () => process.env.DEV_RECOVERY === "1",
  smtp: () => ({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === "1",
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
  }),
  smtpConfigured: () => Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM),
};

module.exports = { env, ROOT_DIR, DATA_DIR, PUBLIC_DIR };
