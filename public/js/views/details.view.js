/**
 * Vistas de detalle de solo lectura, disponibles para todos los roles:
 *   RF-03 · historial de asistencia de un miembro.
 *   RF-05 · integrantes y actividades de un ministerio.
 */
import { esc } from "../core/utils.js";
import { state } from "../core/state.js";
import { memberName } from "../core/labels.js";
import { eventTypeLabel } from "../core/event-types.js";
import { memberAttendanceHistory, ministryActivities } from "../core/stats.js";
import { showDetails } from "../ui/modal.js";

const summaryCard = (label, value) =>
  `<div class="mini-stat"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`;

const simpleTable = (columns, rows, empty) =>
  rows.length
    ? `<div class="tablewrap"><table><thead><tr>${columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${rows
        .map((row) => `<tr>${row.map((v) => `<td>${esc(v)}</td>`).join("")}</tr>`)
        .join("")}</tbody></table></div>`
    : `<p class="empty">${esc(empty)}</p>`;

/** RF-03: cuántas veces asistió un miembro y cuándo. */
export function openMemberHistory(memberId) {
  const member = state.data.members.find((m) => m.id === memberId);
  const history = memberAttendanceHistory(memberId);
  const body =
    `<div class="mini-stats">` +
    summaryCard("Asistencias", history.attended) +
    summaryCard("Ausencias", history.absent) +
    summaryCard("% de asistencia", history.summoned ? history.rate + " %" : "—") +
    summaryCard("Última asistencia", history.lastAttended || "—") +
    `</div>` +
    simpleTable(
      ["Fecha", "Evento", "Tipo", "Estado"],
      history.entries.map((e) => [
        e.date,
        e.event,
        eventTypeLabel(e.type),
        e.present ? "Presente" : "Ausente",
      ]),
      "Este miembro aún no aparece en ninguna lista de asistencia.",
    );
  showDetails(`Historial de asistencia · ${member?.name || "Miembro"}`, body);
}

const eventRow = (e) => [e.date, e.time, e.title, eventTypeLabel(e.type), e.place];

/** RF-05: integrantes y actividades programadas de un ministerio. */
export function openMinistryDetail(ministryId) {
  const ministry = state.data.ministries.find((m) => m.id === ministryId);
  if (!ministry) return;
  const activities = ministryActivities(ministryId);
  const members = (ministry.members || []).map(memberName).sort((a, b) => a.localeCompare(b));
  const body =
    `<div class="mini-stats">` +
    summaryCard("Coordinador", memberName(ministry.coordinator)) +
    summaryCard("Integrantes", members.length) +
    summaryCard("Próximas actividades", activities.upcoming.length) +
    `</div>` +
    `<h3>Integrantes</h3>` +
    (members.length
      ? `<ul class="plain-list">${members.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>`
      : '<p class="empty">Sin integrantes.</p>') +
    `<h3>Actividades programadas</h3>` +
    simpleTable(
      ["Fecha", "Hora", "Actividad", "Tipo", "Lugar"],
      activities.upcoming.map(eventRow),
      "No hay actividades programadas.",
    ) +
    (activities.past.length
      ? `<details><summary>Actividades realizadas (${activities.past.length})</summary>${simpleTable(
          ["Fecha", "Hora", "Actividad", "Tipo", "Lugar"],
          activities.past.map(eventRow),
          "",
        )}</details>`
      : "");
  showDetails(`Ministerio · ${ministry.name}`, body);
}
