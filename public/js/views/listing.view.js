/**
 * Listado genérico de un módulo con búsqueda y filtros:
 * RF-02 (estado activo/inactivo), RF-04 (calendario), RF-06 (periodo y total).
 */
import { api } from "../core/api.js";
import { $, money } from "../core/utils.js";
import { state, refresh } from "../core/state.js";
import { can } from "../core/permissions.js";
import { PAGE_TITLES, COLUMNS } from "../core/labels.js";
import { table } from "../ui/table.js";
import { run } from "../ui/notice.js";
import { renderCalendar } from "./calendar.view.js";
import { openRecordForm } from "./record-form.view.js";

function toolbar(kind) {
  const search = `<input id="search" placeholder="Buscar en ${PAGE_TITLES[kind].toLowerCase()}…" aria-label="Buscar">`;
  const statusFilter =
    kind === "members"
      ? '<select id="active" aria-label="Estado"><option value="all">Todos los estados</option><option value="yes">Activos</option><option value="no">Inactivos</option></select>'
      : "";
  const dateFilter =
    kind === "donations"
      ? '<label>Desde <input id="from" type="date"></label><label>Hasta <input id="to" type="date"></label>'
      : "";
  const calendarButton =
    kind === "events" ? '<button id="calendar">Ver calendario</button>' : "";
  return `<div class="toolbar">${search}${statusFilter}${dateFilter}${calendarButton}</div>`;
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
        editable: can(kind) && kind !== "users",
        deletable: kind === "announcements",
      });

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
          if (confirm("¿Eliminar este comunicado?"))
            run(async () => {
              await api(kind, { id: button.dataset.delete }, "DELETE");
              await refresh();
            });
        }),
    );
  };

  $("#search").oninput = update;
  ["active", "from", "to"].forEach((id) => {
    if ($("#" + id)) $("#" + id).onchange = update;
  });
  if ($("#calendar"))
    $("#calendar").onclick = () => renderCalendar({ onBack: renderListing });
  update();
}
