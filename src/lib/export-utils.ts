// ---------------------------------------------------------------------------
// Client-side export utilities — CSV, XLSX (SpreadsheetML), PDF
// ---------------------------------------------------------------------------

interface ExportColumn {
  key: string;
  label: string;
}

function escapeCSVValue(val: unknown): string {
  const str = val == null ? "" : String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function escapeXML(val: unknown): string {
  const str = val == null ? "" : String(val);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getCellValue(row: Record<string, unknown>, key: string): string {
  const val = row[key];
  if (val == null) return "";
  if (Array.isArray(val)) return val.join(", ");
  if (typeof val === "boolean") return val ? "Oui" : "Non";
  return String(val);
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

export function exportToCSV(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string,
) {
  const header = columns.map((c) => escapeCSVValue(c.label)).join(",");
  const rows = data.map((row) =>
    columns.map((c) => escapeCSVValue(getCellValue(row, c.key))).join(","),
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  downloadBlob(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

// ---------------------------------------------------------------------------
// XLSX Export — SpreadsheetML (XML-based, no dependencies)
// ---------------------------------------------------------------------------

export function exportToXLSX(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string,
) {
  const headerCells = columns
    .map(
      (c) => `<Cell><Data ss:Type="String">${escapeXML(c.label)}</Data></Cell>`,
    )
    .join("");

  const dataRows = data
    .map((row) => {
      const cells = columns
        .map((c) => {
          const val = getCellValue(row, c.key);
          const numVal = Number(val);
          const isNumeric = val !== "" && !isNaN(numVal) && isFinite(numVal);
          const type = isNumeric ? "Number" : "String";
          const display = isNumeric ? String(numVal) : escapeXML(val);
          return `<Cell><Data ss:Type="${type}">${display}</Data></Cell>`;
        })
        .join("");
      return `<Row>${cells}</Row>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="header">
      <Font ss:Bold="1" ss:Size="11"/>
      <Interior ss:Color="#14080e" ss:Pattern="Solid"/>
      <Font ss:Color="#7af17a" ss:Bold="1" ss:Size="11"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Export">
    <Table>
      <Row ss:StyleID="header">${headerCells}</Row>
      ${dataRows}
    </Table>
  </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], {
    type: "application/vnd.ms-excel",
  });
  downloadBlob(blob, filename.endsWith(".xls") ? filename : `${filename}.xls`);
}

// ---------------------------------------------------------------------------
// PDF Export — Uses a printable HTML table in a new window
// ---------------------------------------------------------------------------

export function exportToPDF(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string,
) {
  const headerCells = columns
    .map(
      (c) =>
        `<th style="background:#14080e;color:#7af17a;padding:8px 12px;text-align:left;font-size:12px;border-bottom:2px solid #7af17a;">${escapeXML(c.label)}</th>`,
    )
    .join("");

  const dataRows = data
    .map((row, i) => {
      const bg = i % 2 === 0 ? "#ffffff" : "#f8f8f8";
      const cells = columns
        .map(
          (c) =>
            `<td style="padding:6px 12px;font-size:11px;border-bottom:1px solid #e5e5e5;background:${bg};">${escapeXML(getCellValue(row, c.key))}</td>`,
        )
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeXML(filename)}</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; }
    table { border-collapse: collapse; width: 100%; }
    h1 { font-size: 18px; color: #14080e; margin-bottom: 16px; }
    .info { font-size: 12px; color: #666; margin-bottom: 12px; }
    .actions { margin-bottom: 20px; }
    .actions button {
      background: #14080e; color: #7af17a; border: none; padding: 8px 20px;
      border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;
    }
    .actions button:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <h1>${escapeXML(filename)}</h1>
  <p class="info">Exporté le ${new Date().toLocaleDateString("fr-FR")} — ${data.length} ligne(s)</p>
  <div class="actions no-print">
    <button onclick="window.print()">Imprimer / Enregistrer en PDF</button>
  </div>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${dataRows}</tbody>
  </table>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
