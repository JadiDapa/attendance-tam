/**
 * Koreksi sekali jalan untuk absen pulang Sabtu yang tercatat 17:00 oleh
 * tombol "Otomatis" lama (sebelum jam otomatis ikut Jam Pulang Hari Kerja).
 * Dipakai `scripts/koreksi-sabtu.ts` lewat `SaturdayCorrectionService`.
 *
 * Bebas Prisma: menerima baris sebagai data biasa, mengembalikan rencana.
 */

import { formatTime, workDateTimeToUtc } from "./date";
import {
  autoCheckOutTimeFor,
  missedCheckoutTimeError,
  type WorkDayConfig,
} from "./work-schedule";

/** Jam tetap yang dulu diisi tombol "Otomatis" untuk semua hari. */
const LEGACY_AUTO_CHECK_OUT_TIME = "17:00";

/**
 * Jam Pulang Sabtu yang dituju koreksi ini. Dikunci, bukan sekadar dibaca
 * dari `WorkDay`: kalau `WorkDay` berkata lain, ada yang tidak cocok dan
 * skrip berhenti total.
 */
const EXPECTED_SATURDAY_CHECK_OUT_TIME = "14:00";

export const SATURDAY_CORRECTION_NOTE = `Koreksi sistem: jam pulang otomatis Sabtu seharusnya ${EXPECTED_SATURDAY_CHECK_OUT_TIME}`;

/** `dayOfWeek` Sabtu (`Date#getUTCDay()`). */
export const SATURDAY = 6;

export type SaturdayCorrectionRow = {
  id: string;
  userId: string;
  type: "CHECK_IN" | "CHECK_OUT";
  isManual: boolean;
  createdByAdminId: string | null;
  editedAt: Date | null;
  /** Tanggal kerja (kolom `date`, tengah malam UTC). */
  workDate: Date;
  timestamp: Date;
  /** Absen masuk tanggal yang sama, null kalau tidak ada. */
  checkInTimestamp: Date | null;
};

export type SaturdayCorrection = {
  id: string;
  userId: string;
  workDate: Date;
  from: Date;
  to: Date;
};

export type SaturdayCorrectionPlan =
  | {
      ok: true;
      note: string;
      corrections: SaturdayCorrection[];
      /**
       * Sasaran yang tidak bisa dikoreksi otomatis (absen masuk tidak sebelum
       * Jam Pulang Sabtu). Ditampilkan saat dry-run; `--apply` menolak jalan
       * selama masih ada — koreksi dulu lewat dialog Edit.
       */
      conflicts: (SaturdayCorrection & { reason: string })[];
    }
  | { ok: false; error: string };


/**
 * Sasaran koreksi — semua syarat harus terpenuhi: absen pulang yang
 * dikonfirmasi karyawan sendiri (manual, bukan ditambahkan admin), belum
 * pernah dikoreksi, di hari Sabtu, dan jamnya tepat 17:00 WIB pada tanggal
 * kerjanya. Anomali seperti pulang 05:00 atau 07:01 sengaja tidak tersentuh:
 * jam yang benar hanya diketahui karyawannya.
 */
export function isSaturdayAutoCheckOut(row: SaturdayCorrectionRow): boolean {
  return (
    row.type === "CHECK_OUT" &&
    row.isManual &&
    row.createdByAdminId === null &&
    row.editedAt === null &&
    row.workDate.getUTCDay() === SATURDAY &&
    row.timestamp.getTime() ===
      workDateTimeToUtc(row.workDate, LEGACY_AUTO_CHECK_OUT_TIME)?.getTime()
  );
}

export function planSaturdayCorrection(
  rows: SaturdayCorrectionRow[],
  saturday: WorkDayConfig | null,
): SaturdayCorrectionPlan {
  if (!saturday) {
    return { ok: false, error: "Baris Sabtu (dayOfWeek 6) tidak ada di WorkDay." };
  }
  if (!saturday.isWorkingDay) {
    return { ok: false, error: "Sabtu bukan Hari Kerja di WorkDay — tidak ada Jam Pulang Sabtu." };
  }
  if (saturday.checkOutTime !== EXPECTED_SATURDAY_CHECK_OUT_TIME) {
    return {
      ok: false,
      error: `Jam Pulang Sabtu di WorkDay ${saturday.checkOutTime}, bukan ${EXPECTED_SATURDAY_CHECK_OUT_TIME}.`,
    };
  }

  const corrections: SaturdayCorrection[] = [];
  const conflicts: (SaturdayCorrection & { reason: string })[] = [];

  for (const row of rows.filter(isSaturdayAutoCheckOut)) {
    const time = autoCheckOutTimeFor(row.workDate, [saturday]);
    const correction = {
      id: row.id,
      userId: row.userId,
      workDate: row.workDate,
      from: row.timestamp,
      to: workDateTimeToUtc(row.workDate, time)!,
    };
    // Aturan Absen Pulang Terlewat yang sama: jam pulang harus sesudah jam
    // masuk. Absen masuk ≥ Jam Pulang Sabtu dikoreksi admin lewat dialog Edit.
    const reason = row.checkInTimestamp
      ? missedCheckoutTimeError(time, formatTime(row.checkInTimestamp))
      : null;

    if (reason) conflicts.push({ ...correction, reason });
    else corrections.push(correction);
  }

  return {
    ok: true,
    note: SATURDAY_CORRECTION_NOTE,
    corrections,
    conflicts,
  };
}
