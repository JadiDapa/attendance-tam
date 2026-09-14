import ExcelJS from "exceljs";
import type { MonthlyAttendanceRow } from "@/servers/services/monthly-report.service";

const COMPANY_NAME = "PT. TARUNA ANUGERAH MANDIRI";

/** Kolom absensi persis seperti template — urutan ini menentukan urutan kolom D..M. */
const ABSENSI_COLUMNS: {
  key: keyof Pick<
    MonthlyAttendanceRow,
    | "hadir"
    | "telat"
    | "wfh"
    | "dinasLuar"
    | "sakit"
    | "izin"
    | "alfa"
    | "cuti"
  >;
  label: string;
}[] = [
  { key: "hadir", label: "Hadir" },
  { key: "telat", label: "Telat" },
  { key: "wfh", label: "WFH" },
  { key: "dinasLuar", label: "Dinas Luar" },
  { key: "sakit", label: "Sakit" },
  { key: "izin", label: "Izin" },
  { key: "alfa", label: "Alfa" },
  { key: "cuti", label: "Cuti" },
];

/** Kolom di luar absensi — dibiarkan kosong untuk sekarang, tapi tetap ada di template. */
const TRAILING_COLUMNS = [
  "BPJS Kes. (1%)",
  "BPJS TK (3%)",
  "Jumlah",
  "No. Rekening",
];

const TOTAL_COLUMNS =
  3 + ABSENSI_COLUMNS.length + 2 + TRAILING_COLUMNS.length; // NO, NIP, Nama + absensi + 2 lembur + 4 trailing

/** "14.00" / "03.30" seperti di template — jam.menit, bukan jam:menit. Kosong kalau 0. */
function formatOvertimeMinutes(minutes: number): number | string {
  if (minutes <= 0) return "";

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  return `${String(hours).padStart(2, "0")}.${String(remaining).padStart(2, "0")}`;
}

/** Kosongkan hitungan nol supaya persis seperti template. */
function countOrBlank(value: number): number | string {
  return value > 0 ? value : "";
}

/** Kuning persis seperti header di template asli. */
const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFFF00" },
};

/** "Telat" satu-satunya sub-header yang oranye di template, bukan kuning. */
const TELAT_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFCE4D6" },
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};

export async function buildMonthlyAttendanceWorkbook(options: {
  periodLabel: string;
  rows: MonthlyAttendanceRow[];
}): Promise<ExcelJS.Buffer> {
  const { periodLabel, rows } = options;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Rekap Absensi", {
    views: [{ state: "frozen", ySplit: 4 }],
  });

  sheet.columns = [
    { key: "no", width: 5 },
    { key: "nip", width: 14 },
    { key: "nama", width: 26 },
    ...ABSENSI_COLUMNS.map((col) => ({ key: col.key, width: 10 })),
    { key: "lemburHarian", width: 12 },
    { key: "lemburLibur", width: 12 },
    ...TRAILING_COLUMNS.map((_, index) => ({
      key: `trailing${index}`,
      width: 14,
    })),
  ];

  // Baris 1-2: judul & nama perusahaan.
  sheet.mergeCells(1, 1, 1, TOTAL_COLUMNS);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = "REKAP ABSENSI KARYAWAN";
  titleCell.font = { bold: true, size: 13 };
  titleCell.alignment = { horizontal: "center" };

  sheet.mergeCells(2, 1, 2, TOTAL_COLUMNS);
  const companyCell = sheet.getCell(2, 1);
  companyCell.value = COMPANY_NAME;
  companyCell.font = { bold: true, size: 11 };
  companyCell.alignment = { horizontal: "center" };

  sheet.mergeCells(3, 1, 3, TOTAL_COLUMNS);
  const periodCell = sheet.getCell(3, 1);
  periodCell.value = `Periode: ${periodLabel}`;
  periodCell.font = { italic: true, size: 10 };
  periodCell.alignment = { horizontal: "center" };

  // Baris 4-5: header kolom, "Absensi" jadi satu grup dengan 8 sub-kolom.
  const headerRow1 = 4;
  const headerRow2 = 5;

  sheet.mergeCells(headerRow1, 1, headerRow2, 1);
  sheet.getCell(headerRow1, 1).value = "NO.";

  sheet.mergeCells(headerRow1, 2, headerRow2, 2);
  sheet.getCell(headerRow1, 2).value = "NIP";

  sheet.mergeCells(headerRow1, 3, headerRow2, 3);
  sheet.getCell(headerRow1, 3).value = "Nama";

  const absensiStartCol = 4;
  const absensiEndCol = absensiStartCol + ABSENSI_COLUMNS.length - 1;

  sheet.mergeCells(headerRow1, absensiStartCol, headerRow1, absensiEndCol);
  sheet.getCell(headerRow1, absensiStartCol).value = "Absensi";

  ABSENSI_COLUMNS.forEach((col, index) => {
    sheet.getCell(headerRow2, absensiStartCol + index).value = col.label;
  });

  const lemburHarianCol = absensiEndCol + 1;
  const lemburLiburCol = absensiEndCol + 2;

  sheet.mergeCells(headerRow1, lemburHarianCol, headerRow2, lemburHarianCol);
  sheet.getCell(headerRow1, lemburHarianCol).value = "Lembur Harian";

  sheet.mergeCells(headerRow1, lemburLiburCol, headerRow2, lemburLiburCol);
  sheet.getCell(headerRow1, lemburLiburCol).value = "Lembur Libur";

  const trailingStartCol = lemburLiburCol + 1;

  TRAILING_COLUMNS.forEach((label, index) => {
    const col = trailingStartCol + index;

    sheet.mergeCells(headerRow1, col, headerRow2, col);
    sheet.getCell(headerRow1, col).value = label;
  });

  const telatCol = absensiStartCol + 1;

  for (const rowNumber of [headerRow1, headerRow2]) {
    const row = sheet.getRow(rowNumber);

    for (let col = 1; col <= TOTAL_COLUMNS; col += 1) {
      const cell = row.getCell(col);

      cell.font = { bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.fill =
        rowNumber === headerRow2 && col === telatCol
          ? TELAT_FILL
          : HEADER_FILL;
      cell.border = THIN_BORDER;
    }
  }

  // Baris data.
  let rowNumber = headerRow2 + 1;

  for (const row of rows) {
    const excelRow = sheet.getRow(rowNumber);

    excelRow.getCell(1).value = row.no;
    excelRow.getCell(2).value = row.nip;
    excelRow.getCell(3).value = row.name;

    ABSENSI_COLUMNS.forEach((col, index) => {
      excelRow.getCell(absensiStartCol + index).value = countOrBlank(
        row[col.key],
      );
    });

    excelRow.getCell(lemburHarianCol).value = formatOvertimeMinutes(
      row.lemburHarianMinutes,
    );
    excelRow.getCell(lemburLiburCol).value = formatOvertimeMinutes(
      row.lemburLiburMinutes,
    );

    // BPJS/Jumlah/No. Rekening belum dihitung — sengaja dikosongkan dulu.
    TRAILING_COLUMNS.forEach((_, index) => {
      excelRow.getCell(trailingStartCol + index).value = "";
    });

    for (let col = 1; col <= TOTAL_COLUMNS; col += 1) {
      const cell = excelRow.getCell(col);

      cell.border = THIN_BORDER;
      cell.alignment = {
        horizontal: col === 3 ? "left" : "center",
        vertical: "middle",
      };
    }

    rowNumber += 1;
  }

  return workbook.xlsx.writeBuffer();
}
