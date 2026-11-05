/** XLSX nativo. ExcelJS se inyecta para reutilizarlo en navegador y pruebas. */
export function buildExcelWorkbook(ExcelJS, columns, rows, options = {}) {
  if (!columns.length) throw Error("Selecciona un periodo válido para exportar");
  const { church = "Mi iglesia", title = "Reporte", from, to, grouping = "Detalle", generatedAt = new Date() } = options;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = church;
  workbook.created = generatedAt;
  workbook.calcProperties.fullCalcOnLoad = true;
  const sheet = workbook.addWorksheet("Reporte", {
    views: [{ state: "frozen", ySplit: 6, showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: "1:6" },
  });
  const last = columns.length;
  const dark = "FF59483D", light = "FFF1EBE4", ink = "FF332C27";
  sheet.properties.defaultRowHeight = 23;
  const banner = (row, text, size, fill, color) => {
    if (last > 1) sheet.mergeCells(row, 1, row, last);
    const cell = sheet.getCell(row, 1);
    cell.value = text;
    cell.font = { name: "Calibri", size, bold: true, color: { argb: color } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
    cell.alignment = { vertical: "middle", wrapText: true, indent: 1 };
    sheet.getRow(row).height = row === 1 ? 36 : 30;
  };
  banner(1, church, 18, dark, "FFFFFFFF");
  banner(2, title, 14, light, ink);
  banner(3, `Periodo: ${from || "Inicio"} a ${to || "la fecha"}`, 10, "FFFFFFFF", dark);
  banner(4, `${grouping} · ${rows.length} registros · Generado: ${generatedAt.toLocaleString("es-MX")}`, 10, "FFFFFFFF", dark);
  sheet.getRow(6).values = columns.map(([, label]) => label);
  sheet.getRow(6).height = 30;
  columns.forEach(([key, label], index) => {
    const width = Math.min(44, Math.max(15, label.length + 4,
      ...rows.slice(0, 200).map((row) => String(row[index] ?? "").length + 2)));
    const col = sheet.getColumn(index + 1);
    col.width = key === "amount" ? Math.max(20, width) : width;
    const cell = sheet.getCell(6, index + 1);
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: dark } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  rows.forEach((values, index) => {
    const row = sheet.getRow(index + 7);
    let lines = 1;
    columns.forEach(([key], columnIndex) => {
      const cell = row.getCell(columnIndex + 1);
      const value = values[columnIndex] ?? "";
      const date = ["date", "joined"].includes(key) && /^\d{4}-\d{2}-\d{2}$/.test(value);
      cell.value = date ? new Date(`${value}T00:00:00Z`) : value;
      if (date) cell.numFmt = "dd/mm/yyyy";
      else if (key === "amount") cell.numFmt = '"$"#,##0.00 "MXN"';
      else if (typeof value === "number") cell.numFmt = "#,##0";
      cell.font = { name: "Calibri", size: 11, color: { argb: ink } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: index % 2 ? "FFF7F4F0" : "FFFFFFFF" } };
      cell.border = { bottom: { style: "hair", color: { argb: "FFE2DBD3" } } };
      cell.alignment = { vertical: "middle", wrapText: true, indent: 1, horizontal: typeof value === "number" ? "right" : "left" };
      const width = sheet.getColumn(columnIndex + 1).width - 2;
      lines = Math.max(lines, ...String(value).split("\n").map((line) => Math.ceil(line.length / width)));
    });
    row.height = Math.max(25, lines * 16 + 8);
  });
  if (rows.length) sheet.autoFilter = { from: { row: 6, column: 1 }, to: { row: rows.length + 6, column: last } };
  const amountIndex = columns.findIndex(([key]) => key === "amount");
  if (amountIndex >= 0) {
    const rowNumber = rows.length + 7;
    const row = sheet.getRow(rowNumber);
    row.height = 30;
    row.getCell(1).value = "Total de ingresos";
    for (let i = 1; i <= last; i++) {
      row.getCell(i).font = { name: "Calibri", size: 11, bold: true, color: { argb: ink } };
      row.getCell(i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: light } };
      row.getCell(i).alignment = { vertical: "middle", wrapText: true };
    }
    const cell = row.getCell(amountIndex + 1);
    const letter = sheet.getColumn(amountIndex + 1).letter;
    const result = rows.reduce((sum, values) => sum + Math.round(Number(values[amountIndex]) * 100), 0) / 100;
    cell.value = rows.length ? { formula: `SUBTOTAL(109,${letter}7:${letter}${rowNumber - 1})`, result } : 0;
    cell.numFmt = '"$"#,##0.00 "MXN"';
    cell.alignment = { horizontal: "right", vertical: "middle" };
  }
  if (!rows.length) {
    const row = amountIndex >= 0 ? 9 : 7;
    banner(row, "No hay datos para el periodo seleccionado.", 11, "FFFFFFFF", dark);
    sheet.getRow(row).height = 40;
  }
  const bannerWidth = sheet.columns.reduce((sum, col) => sum + col.width, 0) - 4;
  [1, 2, 3, 4].forEach((row) => {
    const length = String(sheet.getCell(row, 1).value).length;
    sheet.getRow(row).height = Math.max(sheet.getRow(row).height, Math.ceil(length / bannerWidth) * 18 + 12);
  });
  sheet.headerFooter.oddFooter = "Página &P de &N";
  return workbook;
}
