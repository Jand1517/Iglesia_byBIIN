/**
 * Permisos de escritura por módulo en la interfaz. Solo ocultan botones: el
 * servidor (src/config/permissions.js) es quien realmente aplica las reglas.
 * Mantener ambos archivos sincronizados.
 */
import { state } from "./state.js";

export const ROLES = [
  "administrador",
  "pastor",
  "secretario",
  "tesorero",
  "coordinador",
];

const MODULE_WRITE_ROLES = {
  members: ["administrador", "pastor", "secretario"],
  attendance: ["administrador", "pastor", "secretario", "coordinador"],
  events: ["administrador", "pastor", "secretario", "coordinador"],
  ministries: ["administrador", "pastor", "secretario", "coordinador"],
  donations: ["administrador", "tesorero"],
  announcements: ["administrador", "pastor", "secretario"],
  users: ["administrador"],
  settings: ["administrador"],
};

export const can = (module) =>
  MODULE_WRITE_ROLES[module]?.includes(state.me.role);

/** ¿El usuario puede ver información financiera? */
export const financial = () => can("donations");
