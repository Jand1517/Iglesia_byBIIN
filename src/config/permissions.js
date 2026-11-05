/**
 * Roles del sistema y permisos de escritura por módulo (RF-01).
 *
 * Lectura: cualquier usuario autenticado puede consultar los módulos,
 * excepto los marcados en RESTRICTED_READ (información financiera, RF-06).
 * Escritura: solo los roles listados en MODULE_WRITE_ROLES.
 */
const ROLES = Object.freeze([
  "administrador",
  "pastor",
  "secretario",
  "tesorero",
  "coordinador",
]);

const MODULE_WRITE_ROLES = Object.freeze({
  members: ["administrador", "pastor", "secretario"],
  events: ["administrador", "pastor", "secretario", "coordinador"],
  attendance: ["administrador", "pastor", "secretario", "coordinador"],
  ministries: ["administrador", "pastor", "secretario", "coordinador"],
  donations: ["administrador", "tesorero"],
  announcements: ["administrador", "pastor", "secretario"],
  settings: ["administrador"],
});

/** Módulos que, además de escribir, solo pueden leer los roles autorizados. */
const RESTRICTED_READ = Object.freeze(["donations"]);

/** Módulos que admiten eliminación física; el resto se desactiva o cancela. */
const DELETABLE_MODULES = Object.freeze(["announcements"]);

const isModule = (module) => Object.hasOwn(MODULE_WRITE_ROLES, module);
const canWrite = (role, module) =>
  MODULE_WRITE_ROLES[module]?.includes(role) ?? false;
const canRead = (role, module) =>
  !RESTRICTED_READ.includes(module) || canWrite(role, module);

module.exports = {
  ROLES,
  MODULE_WRITE_ROLES,
  DELETABLE_MODULES,
  isModule,
  canRead,
  canWrite,
};
