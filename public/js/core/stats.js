/**
 * Cálculos compartidos por el panel, los reportes y las vistas de detalle.
 * Funciones puras sobre `state.data`: sin DOM, para poder probarlas en Node.
 */
import { state } from "./state.js";
import { isWithinRange, reportPeriod, today } from "./utils.js";

const round1 = (value) => Math.round(value * 10) / 10;

/** Porcentaje con un decimal; 0 si no hay base. */
export const percent = (part, total) => (total ? round1((part / total) * 100) : 0);

/** Total de personas presentes en todas las listas (RF-08). */
export const totalPresences = (attendance = state.data.attendance) =>
  attendance.reduce((sum, a) => sum + a.present.length, 0);

/**
 * RF-07: estado de un comunicado según su vigencia.
 * @returns {"programado"|"vigente"|"vencido"}
 */
export function announcementStatus(announcement, day = today()) {
  if (announcement.date > day) return "programado";
  if (announcement.expires && announcement.expires < day) return "vencido";
  return "vigente";
}

/** RF-03: historial de asistencia de un miembro, del más reciente al más antiguo. */
export function memberAttendanceHistory(memberId, from, to) {
  const events = new Map(state.data.events.map((e) => [e.id, e]));
  const entries = state.data.attendance
    .filter(
      (a) =>
        (a.roster.includes(memberId) || a.present.includes(memberId)) &&
        isWithinRange(a.date, from, to),
    )
    .map((a) => ({
      date: a.date,
      event: events.get(a.event)?.title || "Evento",
      type: events.get(a.event)?.type,
      present: a.present.includes(memberId),
    }))
    .sort((x, y) => y.date.localeCompare(x.date));

  const attended = entries.filter((e) => e.present);
  return {
    entries,
    summoned: entries.length,
    attended: attended.length,
    absent: entries.length - attended.length,
    rate: percent(attended.length, entries.length),
    lastAttended: attended[0]?.date || null,
  };
}

/** RF-05: actividades de un ministerio separadas en próximas y pasadas. */
export function ministryActivities(ministryId, day = today()) {
  const events = state.data.events
    .filter((e) => e.ministry === ministryId)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return {
    upcoming: events.filter((e) => e.date >= day && !e.cancelled),
    past: events.filter((e) => e.date < day && !e.cancelled).reverse(),
    cancelled: events.filter((e) => e.cancelled),
  };
}

/**
 * RF-09: asistencia agrupada por evento (y opcionalmente por periodo).
 * Cada fila: { period?, eventId, sessions, presences, absences, rate }.
 */
export function attendanceByEvent(from, to, period = "detail") {
  const groups = new Map();
  for (const a of state.data.attendance) {
    if (!isWithinRange(a.date, from, to)) continue;
    const periodKey = period === "detail" ? "" : reportPeriod(a.date, period);
    const key = periodKey + "|" + a.event;
    if (!groups.has(key))
      groups.set(key, { period: periodKey, eventId: a.event, sessions: 0, presences: 0, summoned: 0 });
    const group = groups.get(key);
    group.sessions++;
    group.presences += a.present.length;
    group.summoned += Math.max(a.roster.length, a.present.length);
  }
  return [...groups.values()].map((g) => ({
    ...g,
    absences: g.summoned - g.presences,
    rate: percent(g.presences, g.summoned),
  }));
}

/** RF-08: personas presentes por semana durante las últimas `weeks` semanas. */
export function weeklyPresences(weeks = 12, day = today()) {
  const lastMonday = reportPeriod(day, "week");
  const keys = Array.from({ length: weeks }, (_, i) => {
    const d = new Date(lastMonday + "T12:00:00");
    d.setDate(d.getDate() - 7 * (weeks - 1 - i));
    return d.toISOString().slice(0, 10);
  });
  const totals = new Map(keys.map((k) => [k, 0]));
  for (const a of state.data.attendance) {
    const key = reportPeriod(a.date, "week");
    if (totals.has(key)) totals.set(key, totals.get(key) + a.present.length);
  }
  return keys.map((k) => ({ label: k, value: totals.get(k) }));
}

/** RF-08: ingresos por mes durante los últimos `months` meses (requiere permiso). */
export function monthlyIncome(months = 6, day = today()) {
  const [year, month] = day.split("-").map(Number);
  const keys = Array.from({ length: months }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 1 - (months - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
  const totals = new Map(keys.map((k) => [k, 0]));
  for (const d of state.data.donations || []) {
    const key = d.date.slice(0, 7);
    if (totals.has(key)) totals.set(key, totals.get(key) + Math.round(d.amount * 100));
  }
  return keys.map((k) => ({ label: k, value: totals.get(k) / 100 }));
}
