/**
 * Crea la cuenta de administrador de DESARROLLO compartida por el equipo.
 *
 *   npm run db:seed-admin
 *
 * - Es idempotente: si el correo ya existe, no lo modifica.
 * - Se puede cambiar con SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.
 * - Se niega a correr con NODE_ENV=production: estas credenciales están en el
 *   repositorio y cualquiera que lo lea las conoce. Nunca las uses en una base
 *   real de la iglesia.
 *
 * No es una migración a propósito: las migraciones se aplican en todas las
 * bases (incluida la de producción) y esto debe existir solo en desarrollo.
 */
if (process.env.NODE_ENV === "production") {
  console.error("seed-admin: bloqueado con NODE_ENV=production.");
  process.exit(1);
}

const { db } = require("../src/database/connection");
const { usersRepository } = require("../src/database/repositories/users.repository");
const { hashPassword, newId } = require("../src/services/password.service");
const { EMAIL_PATTERN } = require("../src/validators/user.validator");

const DEV_ADMIN = {
  name: "Administrador de pruebas",
  email: (process.env.SEED_ADMIN_EMAIL || "Admin123@gmail.com").toLowerCase(),
  password: process.env.SEED_ADMIN_PASSWORD || "admin12345",
};

if (!EMAIL_PATTERN.test(DEV_ADMIN.email)) {
  console.error("seed-admin: correo inválido.");
  process.exit(1);
}

if (usersRepository.findByEmail(DEV_ADMIN.email)) {
  console.log(`seed-admin: ${DEV_ADMIN.email} ya existe; no se modificó.`);
} else {
  usersRepository.create({
    id: newId(),
    email: DEV_ADMIN.email,
    name: DEV_ADMIN.name,
    role: "administrador",
    hash: hashPassword(DEV_ADMIN.password),
  });
  console.log(`seed-admin: administrador ${DEV_ADMIN.email} creado.`);
}

db.close();
