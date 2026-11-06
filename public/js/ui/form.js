/** Generador de campos de formulario (input, select y textarea). */
import { esc } from "../core/utils.js";

/**
 * Teléfonos: 7 a 20 caracteres entre dígitos, espacios y + - ( ) .
 * Es la misma regla que aplica el servidor (src/validators/record.validator.js).
 */
const PHONE_ATTRIBUTES =
  // Paréntesis y guion escapados: el navegador compila `pattern` con la bandera v.
  'pattern="[0-9+\\(\\)\\-.\\s]{7,20}" title="Solo números, espacios y los signos + - ( ) ."';

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
    control = `<input name="${name}" type="${type}" value="${esc(value)}" ${req} ${type === "password" ? 'minlength="10"' : ""} ${type === "number" ? 'min="0.01" step="0.01"' : ""} ${type === "tel" ? PHONE_ATTRIBUTES : ""}>`;
  return `<label>${esc(label)}${control}</label>`;
}
