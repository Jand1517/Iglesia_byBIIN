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

const reportTypes = () => [
  ["members", "General de miembros"],
  ["attendance", "Asistencia por evento"],
  ["ministries", "Participación por ministerio"],
  ...(financial() ? [["donations", "Ingresos por periodo"]] : []),
];

/** Reporte de miembros, asistencia o ingresos (detalle o agrupado). */
function buildRecordReport(kind, from, to, period) {
  const dateField = kind === "members" ? "joined" : "date";
  const rows = state.data[kind].filter((row) => isWithinRange(row[dateField], from, to));

  const grouped = ["attendance", "donations"].includes(kind) && period !== "detail";
  if (!grouped) {
    const columns = COLUMNS[kind];
    return {
      columns,
      rows: rows.map((row) => columns.map((c) => displayValue(row, c[0]))),
    };
  }

  const isMoney = kind === "donations";
  const totals = new Map();
  rows.forEach((row) => {
    const key = reportPeriod(row.date, period);
    totals.set(key, (totals.get(key) || 0) + (isMoney ? Number(row.amount) : row.present.length));
  });
  return {
    columns: [
      ["period", "Periodo"],
      ["total", isMoney ? "Ingresos MXN" : "Presencias"],
    ],
    rows: [...totals.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => [date, isMoney ? money(total) : total]),
  };
}

function buildReport(kind, from, to, period) {
  if (kind === "ministries")
    return {
      columns: period === "detail" ? MINISTRY_DETAIL_COLUMNS : MINISTRY_GROUPED_COLUMNS,
      rows: buildMinistryReport(from, to, period),
    };
  return buildRecordReport(kind, from, to, period);
}

const reportTable = (title, report, from, to) =>
  `<div class="panel"><h2>${title}</h2><p class="muted">${report.rows.length} registros · ${esc(from || "Inicio")} a ${esc(to || "la fecha")}</p><div class="tablewrap"><table><thead><tr>${report.columns.map((c) => `<th>${esc(c[1])}</th>`).join("")}</tr></thead><tbody>${report.rows.map((row) => `<tr>${row.map((v) => `<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>${report.rows.length ? "" : '<div class="empty">No hay datos para el periodo seleccionado.</div>'}</div></div>`;

export function renderReports() {
  const types = reportTypes();
  let current = { columns: [], rows: [] };

  $("#content").innerHTML =
    `<div class="toolbar"><select id="reporttype" aria-label="Reporte">${types.map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}</select><label>Desde<input id="from" type="date"></label><label>Hasta<input id="to" type="date"></label><select id="period" aria-label="Agrupación"><option value="detail">Detalle</option><option value="week">Semanal</option><option value="month">Mensual</option></select><button id="excel">Exportar Excel (.xls)</button><button id="pdf">Imprimir / PDF</button></div>` +
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
  $("#excel").onclick = () => exportExcel(current.columns, current.rows);
  update();
}
