/** RF-04: calendario mensual de eventos. */
import { $, esc } from "../core/utils.js";
import { state } from "../core/state.js";

const WEEK_DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** @param {{ onBack: () => void }} options  Acción del botón "Volver". */
export function renderCalendar({ onBack }) {
  const { month } = state;
  const [year, monthNumber] = month.split("-").map(Number);
  const firstWeekDay = new Date(year, monthNumber - 1, 1).getDay();
  const daysInMonth = new Date(year, monthNumber, 0).getDate();

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const date = month + "-" + String(i + 1).padStart(2, "0");
    const events = state.data.events
      .filter((e) => e.date === date)
      .map(
        (e) =>
          `<small>${esc(e.time)} ${esc(e.title)}${e.cancelled ? " · Cancelado" : ""}</small>`,
      )
      .join("");
    return `<div class="day">${i + 1}${events}</div>`;
  }).join("");

  $("#rows").innerHTML =
    `<div class="toolbar"><label>Mes <input id="month" type="month" value="${month}"></label><button id="list">Volver al listado</button></div>` +
    `<div class="calendar">${WEEK_DAYS.map((d) => `<b>${d}</b>`).join("")}${"<div></div>".repeat(firstWeekDay)}${days}</div>`;

  $("#month").onchange = (e) => {
    if (e.target.value) {
      state.month = e.target.value;
      renderCalendar({ onBack });
    }
  };
  $("#list").onclick = onBack;
}
