/** Tabla de registros con acciones por fila. */
import { esc } from "../core/utils.js";
import { displayValue } from "../core/labels.js";

/**
 * @param {object[]} rows
 * @param {Array<[string,string]>} columns
 * @param {{
 *   editable?: boolean,        botón Editar
 *   deletable?: boolean,       botón Eliminar
 *   userActions?: boolean,     botón Activar/Desactivar (usuarios)
 *   currentUserId?: string,    la cuenta propia no se desactiva ni elimina
 *   viewAction?: string,       texto de un botón de consulta visible para todos los roles
 * }} options
 */
export function table(
  rows,
  columns,
  { editable = false, deletable = false, userActions = false, currentUserId, viewAction } = {},
) {
  const hasActions = editable || Boolean(viewAction);
  const head = columns.map((c) => `<th>${esc(c[1])}</th>`).join("");
  const body = rows
    .map((r) => {
      const cells = columns
        .map((c) => `<td>${esc(displayValue(r, c[0]))}</td>`)
        .join("");
      const buttons = [
        viewAction && `<button data-view="${esc(r.id)}">${esc(viewAction)}</button>`,
        editable && `<button data-edit="${esc(r.id)}">Editar</button>`,
        editable && userActions && r.id !== currentUserId &&
          `<button data-toggle="${esc(r.id)}">${r.active === false ? "Activar" : "Desactivar"}</button>`,
        editable && deletable && (!userActions || r.id !== currentUserId) &&
          `<button data-delete="${esc(r.id)}">Eliminar</button>`,
      ].filter(Boolean);
      const actions = hasActions ? `<td><div class="row-actions">${buttons.join(" ")}</div></td>` : "";
      return `<tr>${cells}${actions}</tr>`;
    })
    .join("");
  return `<div class="tablewrap"><table><thead><tr>${head}${hasActions ? "<th>Acciones</th>" : ""}</tr></thead><tbody>${body}</tbody></table>${rows.length ? "" : '<div class="empty">Aún no hay registros para mostrar.</div>'}</div>`;
}
