/** Textos de la interfaz: menú, columnas y presentación de valores. */
import { state } from "./state.js";
import { money } from "./utils.js";
import { eventTypeLabel } from "./event-types.js";
import { announcementStatus } from "./stats.js";

/** Páginas del menú lateral, en orden. */
export const PAGE_TITLES = {
  dashboard: "Vista general",
  members: "Miembros",
  attendance: "Asistencia",
  events: "Eventos",
  ministries: "Ministerios",
  donations: "Aportaciones",
  announcements: "Comunicados",
  reports: "Reportes",
  users: "Usuarios",
  settings: "Mi iglesia",
};

/** Columnas de cada tabla: [campo, encabezado]. */
export const COLUMNS = {
  members: [
    ["name", "Nombre"],
    ["phone", "Teléfono"],
    ["email", "Correo"],
    ["joined", "Ingreso"],
    ["active", "Estado"],
  ],
  events: [
    ["title", "Evento"],
    ["type", "Tipo"],
    ["date", "Fecha"],
    ["time", "Hora"],
    ["place", "Lugar"],
    ["responsibles", "Responsables"],
    ["cancelled", "Estado"],
  ],
  ministries: [
    ["name", "Ministerio"],
    ["coordinator", "Coordinador"],
    ["members", "Integrantes"],
  ],
  donations: [
    ["date", "Fecha"],
    ["amount", "Monto"],
    ["concept", "Concepto"],
    ["method", "Método"],
    ["member", "Donante"],
  ],
  announcements: [
    ["title", "Título"],
    ["body", "Mensaje"],
    ["date", "Publicación"],
    ["expires", "Vigente hasta"],
    ["status", "Estado"],
    ["important", "Prioridad"],
  ],
  attendance: [
    ["event", "Evento"],
    ["date", "Fecha"],
    ["present", "Presentes"],
    ["absent", "Ausentes"],
  ],
  users: [
    ["name", "Nombre"],
    ["email", "Correo"],
    ["role", "Rol"],
    ["active", "Estado"],
  ],
};

export const ANNOUNCEMENT_STATUS = {
  programado: "Programado",
  vigente: "Publicado",
  vencido: "Vencido",
};

export const memberName = (id) =>
  state.data.members.find((m) => m.id === id)?.name || "Sin asignar";

export const eventName = (id) =>
  state.data.events.find((e) => e.id === id)?.title || "Evento";

/** Valor legible de un campo para tablas y reportes. */
export function displayValue(row, key) {
  if (key === "type") return eventTypeLabel(row.type);
  if (key === "active") return row.active === false ? "Inactivo" : "Activo";
  if (key === "important") return row.important ? "Importante" : "Normal";
  if (key === "cancelled") return row.cancelled ? "Cancelado" : "Programado";
  if (key === "amount") return money(row.amount);
  if (key === "member") return row.member ? memberName(row.member) : "Anónimo";
  if (key === "coordinator") return memberName(row[key]);
  if (key === "responsibles")
    return (row.responsibles || []).map(memberName).join(", ") || "Sin asignar";
  if (key === "members")
    return (row.members || []).map(memberName).join(", ") || "Sin integrantes";
  if (key === "expires") return row.expires || "Sin vencimiento";
  if (key === "status") return ANNOUNCEMENT_STATUS[announcementStatus(row)];
  if (key === "event") return eventName(row.event);
  if (key === "present") return row.present.length;
  if (key === "absent")
    return (row.roster || []).filter((id) => !row.present.includes(id)).length;
  return row[key] || "—";
}
