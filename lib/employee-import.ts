import { parseCsv, toCsv } from "@/lib/csv";

export type EmployeeImportRow = {
  name: string;
  email: string;
  phone: string;
  role: string;
  password: string;
  position: string;
};

/** Header CSV yang dikenali (case-insensitive) — bebas urutan kolom. */
const HEADER_ALIASES: Record<string, keyof EmployeeImportRow> = {
  nama: "name",
  name: "name",
  email: "email",
  "nomor hp": "phone",
  "no hp": "phone",
  "no. hp": "phone",
  hp: "phone",
  telepon: "phone",
  phone: "phone",
  "phone number": "phone",
  role: "role",
  password: "password",
  jabatan: "position",
  posisi: "position",
  position: "position",
};

export const EMPLOYEE_IMPORT_HEADERS = [
  "Nama",
  "Email",
  "Nomor HP",
  "Role",
  "Password",
  "Jabatan",
];

/** Contoh isi untuk file template yang diunduh admin. */
export function employeeImportTemplateCsv(): string {
  return toCsv(EMPLOYEE_IMPORT_HEADERS, [
    ["Budi Santoso", "budi@tam.test", "081234567890", "EMPLOYEE", "password123", "Staff Gudang"],
  ]);
}

/**
 * Ubah teks CSV mentah jadi baris terstruktur berdasarkan header (kolom tak
 * dikenal diabaikan, baris kosong dilewati). Validasi nilai masing-masing
 * field (format email, role harus salah satu `Role`, dst.) dilakukan
 * terpisah lewat `CreateUserSchema` — di sini murni pemetaan kolom.
 */
export function parseEmployeeImportRows(csvText: string): EmployeeImportRow[] {
  const table = parseCsv(csvText);

  if (table.length === 0) return [];

  const [headerRow, ...dataRows] = table;
  const columnMap = new Map<number, keyof EmployeeImportRow>();

  headerRow.forEach((cell, index) => {
    const key = HEADER_ALIASES[cell.trim().toLowerCase()];
    if (key) columnMap.set(index, key);
  });

  return dataRows
    .map((cells) => {
      const row: EmployeeImportRow = {
        name: "",
        email: "",
        phone: "",
        role: "",
        password: "",
        position: "",
      };

      cells.forEach((cell, index) => {
        const key = columnMap.get(index);
        if (key) row[key] = cell.trim();
      });

      return row;
    })
    .filter((row) => Object.values(row).some((value) => value !== ""));
}
