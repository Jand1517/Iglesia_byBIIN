const { test } = require("node:test");
const assert = require("node:assert/strict");
const ExcelJS = require("exceljs");

const moneyColumns = [["date", "Fecha"], ["amount", "Monto"], ["concept", "Concepto"], ["member", "Donante"]];
async function exported(columns, rows, options) {
  const { buildExcelWorkbook } = await import("../public/js/reports/excel-workbook.js");
  const source = buildExcelWorkbook(ExcelJS, columns, rows, options);
  const bytes = await source.xlsx.writeBuffer();
  assert.equal(bytes.subarray(0, 2).toString(), "PK", "debe ser un XLSX ZIP real");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes);
  return workbook.getWorksheet("Reporte");
}

test("el XLSX conserva fechas, montos numéricos, estilos, filtros, encabezados y total", async () => {
  const sheet = await exported(moneyColumns, [
    ["2026-11-01", 150.35, "Ofrenda", "Anónimo"],
    ["2026-11-02", 0.10, "Aportación", "Ana"],
    ["2026-11-03", 0.20, "Ofrenda", "Luis"],
  ], { church: "Iglesia de prueba", title: "Ingresos por periodo", from: "2026-11-01", to: "2026-11-30" });
  assert.equal(sheet.getCell("A1").value, "Iglesia de prueba");
  assert.equal(sheet.getCell("A2").value, "Ingresos por periodo");
  assert.match(sheet.getCell("A3").value, /2026-11-01 a 2026-11-30/);
  assert.equal(sheet.getCell("A7").value.toISOString(), "2026-11-01T00:00:00.000Z");
  assert.equal(sheet.getCell("A7").numFmt, "dd/mm/yyyy");
  assert.equal(sheet.getCell("B7").value, 150.35);
  assert.match(sheet.getCell("B7").numFmt, /MXN/);
  assert.deepEqual(sheet.getCell("B10").value, { formula: "SUBTOTAL(109,B7:B9)", result: 150.65 });
  assert.equal(sheet.autoFilter, "A6:D9");
  assert.equal(sheet.views[0].ySplit, 6);
  assert.equal(sheet.getCell("A6").font.bold, true);
  assert.notEqual(sheet.getCell("A7").fill.fgColor.argb, sheet.getCell("A8").fill.fgColor.argb);
  assert.equal(sheet.pageSetup.fitToWidth, 1);
});

test("conserva teléfonos y textos que parecen fórmulas como texto, y ajusta descripciones largas", async () => {
  const text = "Descripción extensa de una actividad con los miembros. ".repeat(6);
  const sheet = await exported([["name", "Nombre"], ["phone", "Teléfono"], ["description", "Descripción"]], [
    ["=HYPERLINK(\"https://example.org\")", "0012345678", text],
  ]);
  assert.equal(typeof sheet.getCell("A7").value, "string");
  assert.equal(sheet.getCell("B7").value, "0012345678");
  assert.equal(sheet.getCell("C7").value, text);
  assert.ok(sheet.getRow(7).height > 25);
  assert.ok(sheet.getColumn(3).width <= 44);
});

test("exporta periodos sin datos y agrupaciones sin errores ni totales falsos", async () => {
  const empty = await exported(moneyColumns, []);
  assert.equal(empty.getCell("B7").value, 0);
  assert.match(empty.getCell("A9").value, /No hay datos/);
  const grouped = await exported([["period", "Periodo"], ["amount", "Ingresos MXN"]], [["2026-11", 10.5]]);
  assert.equal(grouped.getCell("A7").value, "2026-11");
  assert.equal(grouped.getCell("B7").value, 10.5);
  assert.equal(grouped.getCell("B8").value.result, 10.5);
  assert.equal(grouped.getCell("B8").numFmt, '"$"#,##0.00 "MXN"');
});

test("los reportes filtran y agrupan sin convertir los importes a cadenas", async () => {
  const { state } = await import("../public/js/core/state.js");
  const { buildReport } = await import("../public/js/views/reports.view.js");
  state.data.donations = [
    { date: "2026-11-01", amount: 0.1 },
    { date: "2026-11-02", amount: 0.2 },
    { date: "2026-12-01", amount: 99 },
  ];
  const detail = buildReport("donations", "2026-11-01", "2026-11-30", "detail");
  assert.deepEqual(detail.rows.map((r) => r[1]), [0.1, 0.2]);
  const grouped = buildReport("donations", "2026-11-01", "2026-11-30", "month");
  assert.deepEqual(grouped.rows, [["2026-11", 0.3]]);
  assert.equal(grouped.columns[1][0], "amount");
});
