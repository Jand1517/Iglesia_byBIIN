/** Tabla de registros con acciones opcionales de editar/eliminar. */
import { esc } from "../core/utils.js";
import { displayValue } from "../core/labels.js";

/**
 * @param {object[]} rows
 * @param {Array<[string,string]>} columns
 * @param {{ editable?: boolean, deletable?: boolean }} options
 */
export function table(rows, columns, { editable = false, deletable = false } = {}) {
  const head = columns.map((c) => `<th>${esc(c[1])}</th>`).join("");
  const body = rows
    .map((r) => {
      const cells = columns
        .map((c) => `<td>${esc(displayValue(r, c[0]))}</td>`)
        .join("");
      const actions = editable
        ? `<td><button data-edit="${esc(r.id)}">Editar</button>${deletable ? ` <button data-delete="${esc(r.id)}">Eliminar</button>` : ""}</td>`
        : "";
      return `<tr>${cells}${actions}</tr>`;
    })
    .join("");
  return `<div class="tablewrap"><table><thead><tr>${head}${editable ? "<th>Acciones</th>" : ""}</tr></thead><tbody>${body}</tbody></table>${rows.length ? "" : '<div class="empty">Aún no hay registros para mostrar.</div>'}</div>`;
}
