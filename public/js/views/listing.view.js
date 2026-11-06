/**
 * Listado genérico de un módulo con búsqueda y filtros:
 * RF-02 (estado activo/inactivo), RF-04 (calendario), RF-06 (periodo y total).
 */
import { api } from "../core/api.js";
import { $, money, esc } from "../core/utils.js";
import { state, refresh } from "../core/state.js";
import { can } from "../core/permissions.js";
import { PAGE_TITLES, COLUMNS, ANNOUNCEMENT_STATUS } from "../core/labels.js";
import { announcementStatus } from "../core/stats.js";
import { table } from "../ui/table.js";
import { run } from "../ui/notice.js";
import { renderCalendar } from "./calendar.view.js";
import { openRecordForm } from "./record-form.view.js";
import { EVENT_TYPES } from "../core/event-types.js";
import { openMemberHistory, openMinistryDetail } from "./details.view.js";

/** Consultas de solo lectura disponibles para todos los roles (RF-03, RF-05). */
const VIEW_ACTIONS = {
  members: { label: "Historial", open: openMemberHistory },
  ministries: { label: "Ver", open: openMinistryDetail },
};

function toolbar(kind) {
  const search = `<input id="search" placeholder="Buscar en ${PAGE_TITLES[kind].toLowerCase()}…" aria-label="Buscar">`;
  const statusFilter =
    ["members", "users"].includes(kind)
      ? '<select id="active" aria-label="Estado"><option value="all">Todos los estados</option><option value="yes">Activos</option><option value="no">Inactivos</option></select>'
      : "";
  const dateFilter =
    kind === "donations"
      ? '<label>Desde <input id="from" type="date"></label><label>Hasta <input id="to" type="date"></label>'
      : "";
  const calendarButton =
    kind === "events" ? '<button id="calendar">Ver calendario</button>' : "";
  const typeFilter = kind === "events" ? `<select id="eventtype" aria-label="Tipo de evento"><option value="">Todos los tipos</option>${[...EVENT_TYPES, ["sin_clasificar", "Sin clasificar"]].map(([value, label]) => `<option value="${esc(value)}">${esc(label)}</option>`).join("")}</select>` : "";
  const announcementFilter =
    kind === "announcements"
      ? `<select id="annstatus" aria-label="Estado del comunicado"><option value="">Todos los estados</option>${Object.entries(ANNOUNCEMENT_STATUS).map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select>`
      : "";
  return `<div class="toolbar">${search}${statusFilter}${dateFilter}${typeFilter}${announcementFilter}${calendarButton}</div>`;
}

/** Aplica búsqueda de texto y filtros de la barra de herramientas. */
function filterRows(kind) {
  const term = $("#search").value.toLowerCase();
  let rows = state.data[kind].filter((r) =>
    Object.values(r).join(" ").toLowerCase().includes(term),
  );
  if ($("#active") && $("#active").value !== "all")
    rows = rows.filter((r) => (r.active !== false) === ($("#active").value === "yes"));
  if ($("#from")?.value) rows = rows.filter((r) => r.date >= $("#from").value);
  if ($("#to")?.value) rows = rows.filter((r) => r.date <= $("#to").value);
  if ($("#eventtype")?.value) rows = rows.filter((r) => r.type === $("#eventtype").value);
  if ($("#annstatus")?.value)
    rows = rows.filter((r) => announcementStatus(r) === $("#annstatus").value);
  return rows;
}

export function renderListing() {
  const kind = state.page;
  $("#content").innerHTML = toolbar(kind) + '<div id="rows"></div>';

  const update = () => {
    const rows = filterRows(kind);
    const total =
      kind === "donations"
        ? `<p>Total del periodo: <strong>${money(rows.reduce((s, r) => s + Number(r.amount), 0))}</strong></p>`
        : "";
    $("#rows").innerHTML =
      total +
      table(rows, COLUMNS[kind], {
        editable: can(kind),
        deletable: ["announcements", "users"].includes(kind),
        userActions: kind === "users",
        currentUserId: state.me.id,
        viewAction: VIEW_ACTIONS[kind]?.label,
      });

    document.querySelectorAll("[data-view]").forEach(
      (button) => (button.onclick = () => VIEW_ACTIONS[kind].open(button.dataset.view)),
    );
    document.querySelectorAll("[data-edit]").forEach(
      (button) =>
        (button.onclick = () =>
          openRecordForm(
            kind,
            state.data[kind].find((r) => r.id === button.dataset.edit),
          )),
    );
    document.querySelectorAll("[data-delete]").forEach(
      (button) =>
        (button.onclick = () => {
          if (confirm(kind === "users" ? "¿Eliminar esta cuenta de usuario permanentemente? Sus sesiones también se cerrarán." : "¿Eliminar este comunicado?"))
            run(async () => {
              await api(kind, { id: button.dataset.delete }, "DELETE");
              await refresh();
            });
        }),
    );
    document.querySelectorAll("[data-toggle]").forEach((button) => {
      button.onclick = () => {
        const record = state.data.users.find((r) => r.id === button.dataset.toggle);
        const active = record.active === false;
        if (confirm(`¿${active ? "Activar" : "Desactivar"} a ${record.name}?${active ? "" : " Sus sesiones se cerrarán y no podrá iniciar sesión."}`))
          run(async () => {
            await api("users", { id: record.id, active }, "PATCH");
            await refresh();
          });
      };
    });
  };

  $("#search").oninput = update;
  ["active", "from", "to", "eventtype", "annstatus"].forEach((id) => {
    if ($("#" + id)) $("#" + id).onchange = update;
  });
  if ($("#calendar"))
    $("#calendar").onclick = () => renderCalendar({ onBack: renderListing, type: $("#eventtype").value });
  update();
}
