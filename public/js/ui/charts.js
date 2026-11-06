/**
 * Gráficas SVG sin dependencias (RF-08).
 *
 * Reglas aplicadas: una sola serie por gráfica (el título la nombra, sin
 * leyenda), un solo eje Y que empieza en 0, cuadrícula tenue, línea de 2px,
 * marcadores de 8px con anillo del color de fondo, barras redondeadas solo en
 * el extremo del dato, etiqueta directa solo en el último valor y tooltip al
 * pasar el cursor (zonas de detección más grandes que la marca).
 */
import { esc } from "../core/utils.js";

const WIDTH = 600;
const HEIGHT = 220;
const PAD = { top: 22, right: 18, bottom: 30, left: 44 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

/**
 * Marcas del eje Y "redondas" (paso de 1, 2 o 5 × 10ⁿ, ~4 divisiones) para
 * que cada etiqueta sea exacta, sin redondeos engañosos.
 */
function niceTicks(value, minStep) {
  const raw = Math.max(value, minStep) / 4;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(minStep, [1, 2, 5, 10].find((s) => s * power >= raw) * power);
  const max = step * Math.max(1, Math.ceil(value / step));
  return Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
}

function frame(points, format, ariaLabel, inner) {
  const ticks = niceTicks(Math.max(...points.map((p) => p.value)), format.minStep ?? 0.01);
  const max = ticks.at(-1);
  const y = (v) => PAD.top + PLOT_H - (v / max) * PLOT_H;
  const grid = ticks
    .map(
      (t) =>
        `<line class="chart-grid" x1="${PAD.left}" x2="${WIDTH - PAD.right}" y1="${y(t)}" y2="${y(t)}"/>` +
        `<text class="chart-axis" x="${PAD.left - 8}" y="${y(t) + 4}" text-anchor="end">${esc(format.axis(t))}</text>`,
    )
    .join("");
  return `<div class="chart"><svg viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${esc(ariaLabel)}">${grid}${inner(y)}</svg><div class="chart-tip" hidden></div></div>`;
}

/** Etiquetas del eje X: todas si caben, si no una de cada `step`. */
const xLabelStep = (count) => Math.ceil(count / 6);

/**
 * Línea de tendencia.
 * @param {{label:string,value:number}[]} points
 * @param {{ value:(v)=>string, axis:(v)=>string, x:(label)=>string }} format
 */
export function lineChart(points, format, ariaLabel) {
  const stepX = PLOT_W / Math.max(1, points.length - 1);
  const x = (i) => PAD.left + i * stepX;
  return frame(points, format, ariaLabel, (y) => {
    const path = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.value)}`).join(" ");
    const labelEvery = xLabelStep(points.length);
    const last = points.length - 1;
    return (
      `<path class="chart-line" d="${path}"/>` +
      points
        .map(
          (p, i) =>
            `<circle class="chart-dot" cx="${x(i)}" cy="${y(p.value)}" r="4"/>` +
            ((last - i) % labelEvery === 0
              ? `<text class="chart-axis" x="${x(i)}" y="${HEIGHT - 8}" text-anchor="middle">${esc(format.x(p.label))}</text>`
              : "") +
            `<rect class="chart-hit" x="${x(i) - stepX / 2}" y="${PAD.top}" width="${stepX}" height="${PLOT_H}" data-tip="${esc(`${format.x(p.label)}: ${format.value(p.value)}`)}"/>`,
        )
        .join("") +
      `<text class="chart-label" x="${x(last)}" y="${y(points[last].value) - 10}" text-anchor="end">${esc(format.value(points[last].value))}</text>`
    );
  });
}

/** Barras verticales (magnitud por periodo). */
export function barChart(points, format, ariaLabel) {
  const slot = PLOT_W / points.length;
  const barW = Math.min(46, slot - 2); // ≥ 2px de separación entre barras
  const r = 4;
  return frame(points, format, ariaLabel, (y) =>
    points
      .map((p, i) => {
        const x0 = PAD.left + i * slot + (slot - barW) / 2;
        const top = y(p.value);
        const base = PAD.top + PLOT_H;
        const h = base - top;
        const rr = Math.min(r, h, barW / 2);
        // Rectángulo con esquinas redondeadas solo arriba (extremo del dato).
        const bar = h > 0
          ? `<path class="chart-bar" d="M${x0},${base} V${top + rr} Q${x0},${top} ${x0 + rr},${top} H${x0 + barW - rr} Q${x0 + barW},${top} ${x0 + barW},${top + rr} V${base} Z"/>`
          : "";
        return (
          bar +
          `<text class="chart-axis" x="${x0 + barW / 2}" y="${HEIGHT - 8}" text-anchor="middle">${esc(format.x(p.label))}</text>` +
          `<rect class="chart-hit" x="${PAD.left + i * slot}" y="${PAD.top}" width="${slot}" height="${PLOT_H}" data-tip="${esc(`${format.x(p.label)}: ${format.value(p.value)}`)}"/>`
        );
      })
      .join("") +
      (() => {
        const lastIndex = points.length - 1;
        const cx = PAD.left + lastIndex * slot + slot / 2;
        return `<text class="chart-label" x="${cx}" y="${y(points[lastIndex].value) - 8}" text-anchor="middle">${esc(format.value(points[lastIndex].value))}</text>`;
      })(),
  );
}

/** Activa los tooltips de todas las gráficas dentro de `root`. */
export function attachChartTooltips(root) {
  root.querySelectorAll(".chart").forEach((chart) => {
    const tip = chart.querySelector(".chart-tip");
    chart.querySelectorAll(".chart-hit").forEach((hit) => {
      hit.onmouseenter = () => {
        tip.textContent = hit.dataset.tip;
        tip.hidden = false;
        hit.classList.add("is-active");
      };
      hit.onmousemove = (event) => {
        const box = chart.getBoundingClientRect();
        tip.style.left = Math.min(event.clientX - box.left + 12, box.width - tip.offsetWidth - 4) + "px";
        tip.style.top = event.clientY - box.top - 34 + "px";
      };
      hit.onmouseleave = () => {
        tip.hidden = true;
        hit.classList.remove("is-active");
      };
    });
  });
}
