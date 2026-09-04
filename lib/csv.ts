const DELIMITER = ";";

/** Karakter yang membuat Excel/Sheets membaca sebuah sel sebagai rumus. */
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

function escapeCell(value: string | number | null | undefined) {
  let text = value == null ? "" : String(value);

  // Teks bebas dari input karyawan (mis. `workModeDetail`) bisa diawali
  // karakter ini — tanpa dijinakkan, Excel/Sheets membacanya sebagai rumus
  // saat file dibuka (CSV formula injection).
  if (FORMULA_TRIGGER.test(text)) text = `'${text}`;

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
