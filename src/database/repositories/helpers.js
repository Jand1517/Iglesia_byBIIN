/** Conversiones entre los valores de la API (JSON) y las columnas de SQLite. */

/** Texto opcional: vacío o ausente → NULL. */
const optionalText = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
};

/** Texto obligatorio, sin espacios sobrantes. */
const requiredText = (value) => String(value ?? "").trim();

/** Referencia opcional a otra tabla: "" o ausente → NULL. */
const optionalId = (value) => (value ? String(value) : null);

const toFlag = (value) => (value === true || value === 1 || value === "true" ? 1 : 0);
const fromFlag = (value) => value === 1;

/**
 * Pesos → centavos sin errores de punto flotante ("150.10" → 15010).
 * Se asume que el validador ya comprobó el formato (máximo 2 decimales).
 */
function toCents(amount) {
  const [integer, decimals = ""] = String(amount).trim().split(".");
  return Number(integer) * 100 + Number(decimals.padEnd(2, "0"));
}

const fromCents = (cents) => cents / 100;

/** Agrupa filas [{ key, value }] en un Map key → value[]. */
function groupBy(rows, keyField, valueField) {
  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row[keyField])) groups.set(row[keyField], []);
    groups.get(row[keyField]).push(row[valueField]);
  }
  return groups;
}

const NOW_SQL = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

module.exports = {
  optionalText,
  requiredText,
  optionalId,
  toFlag,
  fromFlag,
  toCents,
  fromCents,
  groupBy,
  NOW_SQL,
};
