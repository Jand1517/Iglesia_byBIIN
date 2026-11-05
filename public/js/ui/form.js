/** Generador de campos de formulario (input, select y textarea). */
import { esc } from "../core/utils.js";

/**
 * @param {string} name     Atributo name.
 * @param {string} label    Etiqueta visible.
 * @param {string} type     Tipo de input, "select" o "textarea".
 * @param {*}      value    Valor inicial.
 * @param {boolean} required
 * @param {Array<[string,string]>} options  Opciones [valor, texto] para select.
 */
export function field(
  name,
  label,
  type = "text",
  value = "",
  required = true,
  options = [],
) {
  const req = required ? "required" : "";
  let control;
  if (type === "select")
    control = `<select name="${name}" ${req}>${options
      .map(
        (o) =>
          `<option value="${esc(o[0])}" ${String(value) === String(o[0]) ? "selected" : ""}>${esc(o[1])}</option>`,
      )
      .join("")}</select>`;
  else if (type === "textarea")
    control = `<textarea name="${name}" ${req}>${esc(value)}</textarea>`;
  else
    control = `<input name="${name}" type="${type}" value="${esc(value)}" ${req} ${type === "password" ? 'minlength="10"' : ""} ${type === "number" ? 'min="0.01" step="0.01"' : ""}>`;
  return `<label>${esc(label)}${control}</label>`;
}
