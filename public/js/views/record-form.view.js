/**
 * Formularios de alta/edición de cada módulo. Cada constructor recibe el
 * registro actual (`{}` si es nuevo) y devuelve el HTML de sus campos.
 */
import { api } from "../core/api.js";
import { esc, today } from "../core/utils.js";
import { state } from "../core/state.js";
import { ROLES } from "../core/permissions.js";
import { field } from "../ui/form.js";
import { showModal } from "../ui/modal.js";

const DONATION_METHODS = ["Efectivo", "Transferencia", "Tarjeta", "Otro"];

/** Opciones [id, nombre] de miembros, con "Sin asignar" al inicio. */
const memberOptions = () => [
  ["", "Sin asignar"],
  ...state.data.members.map((m) => [m.id, m.name]),
];

const checkboxList = (name, items, isChecked) =>
  `<div class="checks">${items
    .map(
      (item) =>
        `<label><input type="checkbox" name="${name}" value="${esc(item.id)}" ${isChecked(item.id) ? "checked" : ""}>${esc(item.name)}</label>`,
    )
    .join("")}</div>`;

const formBuilders = {
  members: (r) =>
    field("name", "Nombre completo", "text", r.name) +
    field("phone", "Teléfono", "tel", r.phone, false) +
    field("email", "Correo", "email", r.email, false) +
    field("joined", "Fecha de ingreso", "date", r.joined || today()) +
    field("active", "Estado", "select", r.active === false ? "false" : "true", true, [
      ["true", "Activo"],
      ["false", "Inactivo"],
    ]),

  events: (r) =>
    field("title", "Título", "text", r.title) +
    field("date", "Fecha", "date", r.date || today()) +
    field("time", "Hora", "time", r.time) +
    field("place", "Lugar", "text", r.place) +
    field("description", "Descripción", "textarea", r.description, false) +
    field("responsible", "Responsable", "select", r.responsible, false, memberOptions()) +
    field("ministry", "Ministerio relacionado", "select", r.ministry, false, [
      ["", "Ninguno"],
      ...state.data.ministries.map((m) => [m.id, m.name]),
    ]) +
    field("cancelled", "Estado", "select", r.cancelled ? "true" : "false", true, [
      ["false", "Programado"],
      ["true", "Cancelado"],
    ]),

  ministries: (r) => {
    const activities = r.id
      ? `<p>Actividades: ${esc(
          state.data.events
            .filter((e) => e.ministry === r.id)
            .map((e) => e.date + " " + e.title)
            .join(" · ") || "Sin actividades programadas",
        )}</p>`
      : "";
    return (
      field("name", "Nombre del ministerio", "text", r.name) +
      field("coordinator", "Coordinador", "select", r.coordinator, true, memberOptions()) +
      "<label>Integrantes</label>" +
      checkboxList("members", state.data.members, (id) => (r.members || []).includes(id)) +
      activities
    );
  },

  donations: (r) =>
    field("date", "Fecha", "date", r.date || today()) +
    field("amount", "Monto (MXN)", "number", r.amount) +
    field("concept", "Concepto", "text", r.concept) +
    field(
      "method",
      "Método de recepción",
      "select",
      r.method || "Efectivo",
      true,
      DONATION_METHODS.map((x) => [x, x]),
    ) +
    field("member", "Donante (opcional)", "select", r.member, false, [
      ["", "Anónimo"],
      ...memberOptions().slice(1),
    ]),

  announcements: (r) =>
    field("title", "Título", "text", r.title) +
    field("body", "Mensaje", "textarea", r.body) +
    field("date", "Fecha de publicación", "date", r.date || today()) +
    `<label class="checkbox-field"><input type="checkbox" name="important" ${r.important ? "checked" : ""}>Aviso importante</label>`,

  users: () =>
    field("name", "Nombre", "text") +
    field("email", "Correo", "email") +
    field("password", "Contraseña inicial", "password") +
    field("role", "Rol", "select", "secretario", true, ROLES.map((x) => [x, x])),

  attendance: (r) =>
    field(
      "event",
      "Evento",
      "select",
      r.event,
      true,
      state.data.events.map((e) => [e.id, e.title + (e.cancelled ? " (cancelado)" : "")]),
    ) +
    field("date", "Fecha", "date", r.date || today()) +
    '<p class="muted">Marca a los presentes. Los demás integrantes del listado quedarán ausentes.</p>' +
    checkboxList(
      "present",
      state.data.members.filter(
        (m) => m.active !== false || (r.roster || []).includes(m.id),
      ),
      (id) => (r.present || []).includes(id),
    ),
};

/** Convierte los valores del formulario a los tipos que espera la API. */
function toPayload(kind, record, form) {
  const body = { ...record, ...Object.fromEntries(form) };
  if (kind === "members") body.active = body.active === "true";
  if (kind === "events") body.cancelled = body.cancelled === "true";
  if (kind === "announcements") body.important = form.get("important") === "on";
  if (kind === "ministries") body.members = form.getAll("members");
  if (kind === "attendance") body.present = form.getAll("present");
  return body;
}

export function openRecordForm(kind, record = {}) {
  showModal(
    record.id ? "Editar registro" : "Nuevo registro",
    formBuilders[kind]?.(record) ?? "",
    (form) => api(kind, toPayload(kind, record, form)),
  );
}
