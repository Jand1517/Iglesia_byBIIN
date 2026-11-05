/** RF-09: exportación de reportes (Excel XML 2003 y PDF por impresión). */
import { esc, today } from "../core/utils.js";

/** Descarga un archivo .xls (formato XML Spreadsheet 2003). */
export function exportExcel(columns, rows) {
  const cell = (value) =>
    '<Cell><Data ss:Type="String">' + esc(String(value ?? "")) + "</Data></Cell>";
  const xml =
    '<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Reporte"><Table>' +
    [columns.map((column) => column[1]), ...rows]
      .map((row) => "<Row>" + row.map(cell).join("") + "</Row>")
      .join("") +
    "</Table></Worksheet></Workbook>";

  const link = document.createElement("a");
  link.href = URL.createObjectURL(
    new Blob([xml], { type: "application/vnd.ms-excel" }),
  );
  link.download = "reporte-" + today() + ".xls";
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

/** Abre el diálogo de impresión (el usuario elige "Guardar como PDF"). */
export const exportPdf = () => window.print();
