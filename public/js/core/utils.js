/** Utilidades generales de DOM, formato y fechas. */

export const $ = (selector) => document.querySelector(selector);

/** Escapa texto para insertarlo con seguridad en HTML. */
export const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );

/** Fecha local de hoy en formato AAAA-MM-DD. */
export const today = () => new Date().toLocaleDateString("en-CA");

export const money = (value) =>
  Number(value).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

/** ¿La fecha está dentro del rango [from, to]? Los límites vacíos no filtran. */
export function isWithinRange(date, from, to) {
  if (!from && !to) return true;
  if (!date) return false;
  return (!from || date >= from) && (!to || date <= to);
}

/** Clave de agrupación: AAAA-MM (mensual) o el lunes de la semana (semanal). */
export function reportPeriod(date, period) {
  if (period === "month") return date.slice(0, 7);
  const monday = new Date(date + "T12:00:00");
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}
