/** RF-09: participación por ministerio (integrantes, actividades, asistencias). */
import { isWithinRange, reportPeriod } from "../core/utils.js";
import { state } from "../core/state.js";
import { memberName } from "../core/labels.js";

export const MINISTRY_DETAIL_COLUMNS = [
  ["ministry", "Ministerio"],
  ["coordinator", "Coordinador"],
  ["members", "Integrantes"],
  ["activities", "Actividades"],
  ["participations", "Participaciones"],
];

export const MINISTRY_GROUPED_COLUMNS = [
  ["period", "Periodo"],
  ...MINISTRY_DETAIL_COLUMNS,
];

/** Asistencias de integrantes del ministerio en una lista de asistencia. */
const countParticipations = (attendance, members) =>
  attendance.present.filter((id) => members.has(id)).length;

/**
 * @param {string} from    Fecha inicial (opcional).
 * @param {string} to      Fecha final (opcional).
 * @param {"detail"|"week"|"month"} period
 * @returns {Array<Array<string|number>>} Filas del reporte.
 */
export function buildMinistryReport(from, to, period) {
  const { data } = state;
  const result = [];

  for (const ministry of data.ministries) {
    const members = new Set(ministry.members || []);
    const activities = data.events.filter(
      (event) =>
        event.ministry === ministry.id &&
        !event.cancelled &&
        isWithinRange(event.date, from, to),
    );
    const attendances = data.attendance.filter(
      (attendance) =>
        activities.some((event) => event.id === attendance.event) &&
        isWithinRange(attendance.date, from, to),
    );
    const coordinator = memberName(ministry.coordinator);

    if (period === "detail") {
      result.push([
        ministry.name,
        coordinator,
        members.size,
        activities.length,
        attendances.reduce((sum, a) => sum + countParticipations(a, members), 0),
      ]);
      continue;
    }

    const groups = new Map();
    const groupFor = (date) => {
      const key = reportPeriod(date, period);
      if (!groups.has(key)) groups.set(key, { activities: 0, participations: 0 });
      return groups.get(key);
    };
    activities.forEach((event) => groupFor(event.date).activities++);
    attendances.forEach((a) => {
      groupFor(a.date).participations += countParticipations(a, members);
    });

    [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, group]) =>
        result.push([
          date,
          ministry.name,
          coordinator,
          members.size,
          group.activities,
          group.participations,
        ]),
      );
  }
  return result;
}
