/**
 * RF-08: panel principal.
 *   · Indicadores: miembros activos, eventos próximos, personas presentes
 *     registradas, ministerios y, para roles autorizados, ingresos del mes.
 *   · Gráficas: tendencia semanal de asistencia, ingresos mensuales
 *     (autorizados) y participación por ministerio.
 *   · RF-07: avisos vigentes (publicados y no vencidos), importantes primero.
 */
import { $, esc, money, today } from "../core/utils.js";
import { state } from "../core/state.js";
import { financial } from "../core/permissions.js";
import { eventTypeLabel } from "../core/event-types.js";
import {
  totalPresences,
  weeklyPresences,
  monthlyIncome,
  announcementStatus,
} from "../core/stats.js";
import { lineChart, barChart, attachChartTooltips } from "../ui/charts.js";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const dayMonth = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const monthName = (yyyyMm) => MONTHS[Number(yyyyMm.slice(5, 7)) - 1];
const compactMoney = (v) => (v >= 1000 ? "$" + Math.round(v / 100) / 10 + "k" : "$" + Math.round(v));

const statCard = ([label, value, caption, variant = ""]) =>
  `<div class="stat ${variant}"><small>${esc(label)}</small><strong>${esc(value)}</strong><small>${esc(caption)}</small></div>`;

const bar = (label, percent, value) =>
  `<div class="bar"><span>${esc(label)}</span><i style="width:${percent}%"></i><b>${value}</b></div>`;

export function renderDashboard() {
  const { data, month } = state;
  const day = today();
  const activeMembers = data.members.filter((m) => m.active !== false).length;
  const upcoming = data.events
    .filter((e) => e.date >= day && !e.cancelled)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const notices = data.announcements
    .filter((a) => announcementStatus(a, day) === "vigente")
    .sort((a, b) => Number(b.important) - Number(a.important) || b.date.localeCompare(a.date));
  const presences = totalPresences();
  const monthIncome = financial()
    ? data.donations
        .filter((d) => d.date.startsWith(month))
        .reduce((sum, d) => sum + Math.round(d.amount * 100), 0) / 100
    : 0;

  const stats = [
    ["Miembros activos", activeMembers, "Personas en nuestra comunidad"],
    ["Próximos eventos", upcoming.length, "Encuentros por compartir"],
    ["Asistencias registradas", presences, `Personas presentes en ${data.attendance.length} listas`],
    ["Ministerios", data.ministries.length, "Espacios para servir"],
    ...(financial() ? [["Ingresos del mes", money(monthIncome), "Resumen de " + month, "stat-money"]] : []),
  ]
    .map(statCard)
    .join("");

  const weekly = weeklyPresences(12, day);
  const attendanceChart = weekly.some((p) => p.value)
    ? lineChart(
        weekly,
        { value: (v) => `${v} presentes`, axis: String, x: (label) => "sem. " + dayMonth(label), minStep: 1 },
        `Personas presentes por semana en las últimas 12 semanas; última semana: ${weekly.at(-1).value}`,
      )
    : '<p class="muted">Registra asistencia para ver la tendencia semanal.</p>';

  const income = financial() ? monthlyIncome(6, day) : [];
  const incomePanel = financial()
    ? `<div class="panel"><h2>Ingresos por mes</h2><p class="muted chart-caption">Últimos 6 meses · MXN</p>${barChart(
        income,
        { value: money, axis: compactMoney, x: monthName },
        `Ingresos por mes en los últimos 6 meses; mes actual: ${money(income.at(-1).value)}`,
      )}</div>`
    : "";

  const upcomingPanel =
    upcoming
      .slice(0, 5)
      .map(
        (e) =>
          `<div class="row"><div><strong>${esc(e.title)}</strong><p class="muted" style="margin:7px 0 0">${esc(eventTypeLabel(e.type))} · ${esc(e.place)} · ${esc(e.time)}</p></div><span class="badge">${esc(e.date)}</span></div>`,
      )
      .join("") || '<p class="empty">Aún no hay próximos eventos.</p>';

  const ministriesPanel =
    data.ministries
      .map((m) => {
        const size = (m.members || []).length;
        return bar(m.name, Math.min(100, (size / Math.max(1, activeMembers)) * 100), size);
      })
      .join("") || '<p class="empty">Registra tu primer ministerio.</p>';

  const noticesPanel =
    notices
      .slice(0, 4)
      .map(
        (a) =>
          `<div class="row"><div><strong>${esc(a.title)}${a.important ? ' <span class="badge important">Importante</span>' : ""}</strong><p>${esc(a.body)}</p><small>Publicado ${esc(a.date)}${a.expires ? " · vigente hasta " + esc(a.expires) : ""}</small></div></div>`,
      )
      .join("") || '<p class="muted">No hay avisos vigentes.</p>';

  $("#content").innerHTML =
    `<div class="hero"><p class="eyebrow">Cada persona cuenta</p><h2>Una comunidad que crece unida.</h2><p>Acompañar, organizar y servir. Aquí encontrarás una mirada a los miembros, encuentros y ministerios de tu iglesia.</p></div>` +
    `<div class="stats">${stats}</div>` +
    `<div class="grid">` +
    `<div class="panel"><h2>Asistencia por semana</h2><p class="muted chart-caption">Personas presentes · últimas 12 semanas</p>${attendanceChart}</div>` +
    `<div class="panel"><h2>Próximos encuentros</h2>${upcomingPanel}</div>` +
    incomePanel +
    `<div class="panel"><h2>Avisos vigentes</h2>${noticesPanel}</div>` +
    `<div class="panel"><h2>Participación por ministerio</h2><p class="muted chart-caption">Integrantes por ministerio</p>${ministriesPanel}</div>` +
    `</div>`;

  attachChartTooltips($("#content"));
}
