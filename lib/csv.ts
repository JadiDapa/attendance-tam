const DELIMITER = ";";

function escapeCell(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);

  return /[";\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * CSV dengan pemisah titik koma dan BOM UTF-8 — kombinasi yang langsung terbaca
 * rapi oleh Excel berlokal Indonesia.
 */
export function toCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  const lines = [headers, ...rows].map((row) =>
    row.map(escapeCell).join(DELIMITER),
  );

  return `﻿${lines.join("\r\n")}\r\n`;
}
