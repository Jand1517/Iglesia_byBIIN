/** RF-09: exportación XLSX nativa y PDF por impresión. */
import { today } from "../core/utils.js";
import { buildExcelWorkbook } from "./excel-workbook.js";

let libraryPromise;
function loadExcelJS() {
  if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
  if (!libraryPromise) libraryPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/vendor/exceljs.min.js";
    script.onload = () => resolve(window.ExcelJS);
    script.onerror = () => {
      script.remove();
      libraryPromise = null;
      reject(Error("No se pudo cargar el exportador de Excel. Intenta de nuevo."));
    };
    document.head.append(script);
  });
  return libraryPromise;
}

export async function exportExcel(columns, rows, options = {}) {
  const ExcelJS = await loadExcelJS();
  const workbook = buildExcelWorkbook(ExcelJS, columns, rows, options);
  const buffer = await workbook.xlsx.writeBuffer();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }));
  link.download = "reporte-" + (options.kind || "general") + "-" + today() + ".xlsx";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

export const exportPdf = () => window.print();
