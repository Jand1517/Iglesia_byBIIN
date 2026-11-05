/** RF-08: panel principal con indicadores, próximos eventos y gráficas. */
import { $, esc, money, today } from "../core/utils.js";
import { state } from "../core/state.js";
import { financial } from "../core/permissions.js";

const statCard = ([label, value, caption]) =>
  `<div class="stat"><small>${label}</small><strong>${value}</strong><small>${caption}</small></div>`;

const bar = (label, percent, value) =>
  `<div class="bar"><span>${esc(label)}</span><i style="width:${percent}%"></i><b>${value}</b></div>`;

export function renderDashboard() {
  const { data, month } = state;
  const activeMembers = data.members.filter((m) => m.active !== false).length;
  const upcoming = data.events
    .filter((e) => e.date >= today() && !e.cancelled)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const notices = data.announcements
    .filter((a) => a.important || a.date >= today())
    .sort(
      (a, b) =>
        Number(b.important) - Number(a.important) || a.date.localeCompare(b.date),
    );

  const stats = [
    ["Miembros activos", activeMembers, "Personas en nuestra comunidad"],
    ["Próximos eventos", upcoming.length, "Encuentros por compartir"],
    ["Asistencias registradas", data.attendance.length, "Eventos con lista de asistencia"],
    ["Ministerios", data.ministries.length, "Espacios para servir"],
  ]
    .map(statCard)
    .join("");

  const upcomingPanel =
    upcoming
      .slice(0, 5)
      .map(
        (e) =>
          `<div class="row"><div><strong>${esc(e.title)}</strong><p class="muted" style="margin:7px 0 0">${esc(e.place)} · ${esc(e.time)}</p></div><span class="badge">${esc(e.date)}</span></div>`,
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
          `<div class="row"><div><strong>${esc(a.title)}${a.important ? ' <span class="badge important">Importante</span>' : ""}</strong><p>${esc(a.body)}</p><small>${esc(a.date)}</small></div></div>`,
      )
      .join("") || '<p class="muted">Sin avisos publicados.</p>';

  const attendancePanel =
    data.attendance
      .slice(-6)
      .map((a) =>
        bar(
          a.date,
          (a.present.length / Math.max(1, a.roster?.length || activeMembers)) * 100,
          a.present.length,
        ),
      )
      .join("") || '<p class="muted">Registra asistencia para ver las estadísticas.</p>';

  const incomePanel = financial()
    ? `<hr><small>Ingresos de ${esc(month)}</small><h2 style="margin-top:12px">${money(
        data.donations
          .filter((d) => d.date.startsWith(month))
          .reduce((sum, d) => sum + Number(d.amount), 0),
      )}</h2>`
    : "";

  $("#content").innerHTML =
    `<div class="hero"><p class="eyebrow">Cada persona cuenta</p><h2>Una comunidad que crece unida.</h2><p>Acompañar, organizar y servir. Aquí encontrarás una mirada a los miembros, encuentros y ministerios de tu iglesia.</p></div>` +
    `<div class="stats">${stats}</div>` +
    `<div class="grid">` +
    `<div class="panel"><h2>Próximos encuentros</h2>${upcomingPanel}</div>` +
    `<div class="panel"><h2>Participación por ministerio</h2>${ministriesPanel}</div>` +
    `<div class="panel"><h2>Avisos importantes y próximos</h2>${noticesPanel}</div>` +
    `<div class="panel"><h2>Asistencia reciente</h2>${attendancePanel}${incomePanel}</div>` +
    `</div>`;
}
