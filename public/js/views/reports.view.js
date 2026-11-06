/**
 * RF-09: reportes de miembros, asistencia, participación por ministerio e
 * ingresos, con filtros de periodo, agrupación y exportación.
 */
import { $, esc, money, isWithinRange, reportPeriod } from "../core/utils.js";
import { state } from "../core/state.js";
import { financial } from "../core/permissions.js";
import { COLUMNS, displayValue } from "../core/labels.js";
import {
  buildMinistryReport,
  MINISTRY_DETAIL_COLUMNS,
  MINISTRY_GROUPED_COLUMNS,
} from "../reports/ministry-report.js";
import { exportExcel, exportPdf } from "../reports/export.js";
import { run } from "../ui/notice.js";
import { eventTypeLabel } from "../core/event-types.js";
import { attendanceByEvent, memberAttendanceHistory } from "../core/stats.js";

const reportTypes = () => [
  ["members", "General de miembros"],
  ["attendance", "Asistencia por evento"],
  ["memberAttendance", "Asistencia por miembro"],
  ["ministries", "Participación por ministerio"],
  ...(financial() ? [["donations", "Ingresos por periodo"]] : []),
];

const ATTENDANCE_COLUMNS = [
  ["event", "Evento"],
  ["type", "Tipo"],
  ["sessions", "Listas"],
  ["presences", "Presencias"],
  ["absences", "Ausencias"],
  ["rate", "% asistencia"],
];

/** RF-09: asistencia agrupada por evento (y por semana o mes si se elige). */
function buildAttendanceReport(from, to, period) {
  const events = new Map(state.data.events.map((e) => [e.id, e]));
  const rows = attendanceByEvent(from, to, period)
    .map((g) => {
      const event = events.get(g.eventId);
      const values = [
        event?.title || "Evento",
        eventTypeLabel(event?.type),
        g.sessions,
        g.presences,
        g.absences,
        g.rate,
      ];
      return period === "detail" ? values : [g.period, ...values];
    })
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])) || String(a[1]).localeCompare(String(b[1])));
  return {
    columns: period === "detail" ? ATTENDANCE_COLUMNS : [["period", "Periodo"], ...ATTENDANCE_COLUMNS],
    rows,
  };
}

/** RF-03 / RF-09: participación de cada miembro en el periodo. */
function buildMemberAttendanceReport(from, to) {
  const rows = state.data.members
    .map((m) => ({ member: m, history: memberAttendanceHistory(m.id, from, to) }))
    .filter(({ member, history }) => history.summoned || member.active !== false)
    .sort((a, b) => a.member.name.localeCompare(b.member.name))
    .map(({ member, history }) => [
      member.name,
      member.active === false ? "Inactivo" : "Activo",
      history.summoned,
      history.attended,
      history.absent,
      history.rate,
      history.lastAttended || "—",
    ]);
  return {
    columns: [
      ["name", "Miembro"],
      ["active", "Estado"],
      ["summoned", "Convocado"],
      ["presences", "Asistencias"],
      ["absences", "Ausencias"],
      ["rate", "% asistencia"],
      ["lastAttended", "Última asistencia"],
    ],
    rows,
  };
}

/** Reporte de miembros o ingresos (detalle o agrupado). */
function buildRecordReport(kind, from, to, period) {
  const dateField = kind === "members" ? "joined" : "date";
  const rows = state.data[kind].filter((row) => isWithinRange(row[dateField], from, to));

  const grouped = kind === "donations" && period !== "detail";
  if (!grouped) {
    const columns = COLUMNS[kind];
    return {
      columns,
      rows: rows.map((row) => columns.map((c) => c[0] === "amount" ? Number(row.amount) : displayValue(row, c[0]))),
    };
  }

  // Ingresos agrupados por semana o mes, sumando en centavos.
  const totals = new Map();
  rows.forEach((row) => {
    const key = reportPeriod(row.date, period);
    totals.set(key, (totals.get(key) || 0) + Math.round(Number(row.amount) * 100));
  });
  return {
    columns: [
      ["period", "Periodo"],
      ["amount", "Ingresos MXN"],
    ],
    rows: [...totals.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, cents]) => [date, cents / 100]),
  };
}

export function buildReport(kind, from, to, period) {
  if (kind === "attendance") return buildAttendanceReport(from, to, period);
  if (kind === "memberAttendance") return buildMemberAttendanceReport(from, to);
  if (kind === "ministries")
    return {
      columns: period === "detail" ? MINISTRY_DETAIL_COLUMNS : MINISTRY_GROUPED_COLUMNS,
      rows: buildMinistryReport(from, to, period),
    };
  return buildRecordReport(kind, from, to, period);
}

const reportTable = (title, report, from, to) =>
  `<div class="panel"><h2>${esc(title)}</h2><p class="muted">${report.rows.length} registros · ${esc(from || "Inicio")} a ${esc(to || "la fecha")}</p><div class="tablewrap"><table><thead><tr>${report.columns.map((c) => `<th>${esc(c[1])}</th>`).join("")}</tr></thead><tbody>${report.rows.map((row) => `<tr>${row.map((v, i) => `<td>${esc(report.columns[i][0] === "amount" ? money(v) : report.columns[i][0] === "rate" ? v + " %" : v)}</td>`).join("")}</tr>`).join("")}</tbody></table>${report.rows.length ? "" : '<div class="empty">No hay datos para el periodo seleccionado.</div>'}</div></div>`;

export function renderReports() {
  const types = reportTypes();
  let current = { columns: [], rows: [] };

  $("#content").innerHTML =
    `<div class="toolbar"><select id="reporttype" aria-label="Reporte">${types.map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}</select><label>Desde<input id="from" type="date"></label><label>Hasta<input id="to" type="date"></label><select id="period" aria-label="Agrupación"><option value="detail">Detalle</option><option value="week">Semanal</option><option value="month">Mensual</option></select><button id="excel">Exportar Excel (.xlsx)</button><button id="pdf">Imprimir / PDF</button></div>` +
    `<h2 class="report-title">${esc(state.data.settings[0]?.name)} · Reporte</h2><div id="report"></div>`;

  const update = () => {
    const kind = $("#reporttype").value;
    const from = $("#from").value;
    const to = $("#to").value;
    const period = $("#period").value;

    if (from && to && from > to) {
      current = { columns: [], rows: [] };
      $("#report").innerHTML =
        '<p class="empty">La fecha inicial debe ser anterior a la fecha final.</p>';
      return;
    }

    current = buildReport(kind, from, to, period);
    const title = types.find((type) => type[0] === kind)[1];
    $("#report").innerHTML = reportTable(title, current, from, to);
  };

  ["reporttype", "from", "to", "period"].forEach((id) => ($("#" + id).onchange = update));
  $("#pdf").onclick = exportPdf;
  $("#excel").onclick = () => {
    const button = $("#excel");
    const options = {
      church: state.data.settings[0]?.name || "Mi iglesia",
      title: types.find(([key]) => key === $("#reporttype").value)[1],
      kind: $("#reporttype").value,
      from: $("#from").value,
      to: $("#to").value,
      grouping: $("#period").selectedOptions[0].textContent,
    };
    run(async () => {
      button.disabled = true;
      button.textContent = "Generando Excel…";
      try { await exportExcel(current.columns, current.rows, options); }
      finally { button.disabled = false; button.textContent = "Exportar Excel (.xlsx)"; }
    });
  };
  update();
}
