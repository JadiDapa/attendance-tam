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

/** Baris pertama menentukan pemisah dipakai seluruh file — titik koma menang
 * kalau sama banyak (default `toCsv`/Excel lokal Indonesia). */
function detectDelimiter(firstLine: string): string {
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;

  return commas > semicolons ? "," : ";";
}

/**
 * Parser CSV umum (dipakai import massal, bukan hanya file yang dihasilkan
 * `toCsv`) — menangani sel berkutip (`"..."`, termasuk pemisah/baris baru di
 * dalamnya dan `""` sebagai kutip literal) serta BOM UTF-8. Delimiter
 * dideteksi otomatis dari baris pertama supaya file yang disimpan Excel versi
 * lain (koma) tetap terbaca.
 */
export function parseCsv(text: string): string[][] {
  const content = text.replace(/^﻿/, "");
  const delimiter = detectDelimiter(content.split(/\r?\n/, 1)[0] ?? "");

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };

  const pushRow = () => {
    pushField();
    if (row.some((cell) => cell !== "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (inQuotes) {
      if (char === '"' && content[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      pushField();
    } else if (char === "\r" || char === "\n") {
      if (char === "\r" && content[i + 1] === "\n") i++;
      pushRow();
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) pushRow();

  return rows;
}
