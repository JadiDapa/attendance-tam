import {
  LeaveReasonCategory,
  LeaveStage,
  LeaveStatus,
  LeaveType,
  Role,
} from "@/generated/prisma";
import { addDays, getWorkDate, toDateInputValue } from "./date";

/** Role reviewer -> giliran approval yang boleh mereka putuskan. */
export const LEAVE_REVIEWER_STAGE: Partial<Record<Role, LeaveStage>> = {
  [Role.SUPERVISOR]: LeaveStage.SUPERVISOR,
  [Role.MANAGER]: LeaveStage.MANAGER,
};

export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  IZIN: "Izin",
  SAKIT: "Sakit",
  CUTI: "Cuti",
};

export const LEAVE_REASON_CATEGORY_LABEL: Record<LeaveReasonCategory, string> = {
  CUTI_TAHUNAN: "Cuti Tahunan",
  CUTI_KHUSUS: "Cuti Khusus",
  MELAHIRKAN: "Melahirkan",
  MENIKAH: "Menikah",
  IZIN_PRIBADI: "Izin Pribadi",
  IZIN_KELUARGA: "Izin Keluarga",
  KEPERLUAN_MENDESAK: "Keperluan Mendesak",
  DATANG_TERLAMBAT: "Datang Terlambat",
  PULANG_LEBIH_AWAL: "Pulang Lebih Awal",
  TIDAK_MASUK: "Tidak Masuk",
  LAINNYA: "Lainnya",
};

/** Pilihan kategori "Alasan" untuk `type = CUTI`. */
export const CUTI_REASON_CATEGORIES: LeaveReasonCategory[] = [
  LeaveReasonCategory.CUTI_TAHUNAN,
  LeaveReasonCategory.CUTI_KHUSUS,
  LeaveReasonCategory.MELAHIRKAN,
  LeaveReasonCategory.MENIKAH,
  LeaveReasonCategory.LAINNYA,
];

/** Pilihan kategori "Alasan" untuk `type = IZIN`. */
export const IZIN_REASON_CATEGORIES: LeaveReasonCategory[] = [
  LeaveReasonCategory.IZIN_PRIBADI,
  LeaveReasonCategory.IZIN_KELUARGA,
  LeaveReasonCategory.KEPERLUAN_MENDESAK,
  LeaveReasonCategory.DATANG_TERLAMBAT,
  LeaveReasonCategory.PULANG_LEBIH_AWAL,
  LeaveReasonCategory.TIDAK_MASUK,
  LeaveReasonCategory.LAINNYA,
];

/** Kategori "Alasan" yang berlaku per jenis izin — `SAKIT` sengaja tidak ada
 * (kategorinya selalu null, hanya `detail` yang wajib). */
export const LEAVE_REASON_CATEGORIES_BY_TYPE: Partial<
  Record<LeaveType, LeaveReasonCategory[]>
> = {
  CUTI: CUTI_REASON_CATEGORIES,
  IZIN: IZIN_REASON_CATEGORIES,
};

export const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

export const LEAVE_STATUS_VARIANT: Record<
  LeaveStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "outline",
  APPROVED: "default",
  REJECTED: "destructive",
};

export const LEAVE_STAGE_LABEL: Record<LeaveStage, string> = {
  SUPERVISOR: "Menunggu Supervisor",
  MANAGER: "Menunggu Manager",
  DONE: "Selesai",
};

export type InitialLeaveStage = {
  stage: LeaveStage;
  status: LeaveStatus;
  reviewNote: string | null;
  reviewedAt: Date | null;
};

/**
 * Giliran approval awal pengajuan izin/cuti/sakit, tergantung role pemohon —
 * satu langkah saja untuk ketiga jenis, tidak lagi berjenjang:
 * - Karyawan & admin: menunggu SUPERVISOR.
 * - Supervisor: tidak ada supervisor lain di atasnya, jadi menunggu MANAGER.
 * - Manager: tidak ada lagi yang perlu menyetujui, jadi langsung disetujui
 *   otomatis — tetap tercatat untuk oversight.
 */
export function resolveInitialLeaveStage(role: Role): InitialLeaveStage {
  if (role === Role.MANAGER) {
    return {
      stage: LeaveStage.DONE,
      status: LeaveStatus.APPROVED,
      reviewNote: "Disetujui otomatis — pengajuan manager",
      reviewedAt: new Date(),
    };
  }

  if (role === Role.SUPERVISOR) {
    return {
      stage: LeaveStage.MANAGER,
      status: LeaveStatus.PENDING,
      reviewNote: null,
      reviewedAt: null,
    };
  }

  return {
    stage: LeaveStage.SUPERVISOR,
    status: LeaveStatus.PENDING,
    reviewNote: null,
    reviewedAt: null,
  };
}

/**
 * Approval izin/cuti/sakit selalu satu langkah saja (tidak berjenjang) —
 * begitu reviewer di `stage` saat ini memutuskan, pengajuan langsung selesai.
 */
export function nextLeaveStage(): LeaveStage {
  return LeaveStage.DONE;
}

/** Jumlah hari pengajuan (inklusif). Kedua tanggal adalah kolom `date` UTC. */
export function countLeaveDays(startDate: Date, endDate: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;

  return Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;
}

/**
 * Cuti wajib diajukan jauh-jauh hari — 30 hari ke depan tidak bisa dipilih
 * sebagai tanggal mulai, supaya ada waktu approval sebelum tanggalnya tiba.
 */
export const CUTI_MIN_ADVANCE_DAYS = 30;

/** Tanggal mulai Cuti paling cepat yang boleh diajukan, dihitung dari `today`. */
export function minCutiStartDate(today: Date = getWorkDate()): Date {
  return addDays(today, CUTI_MIN_ADVANCE_DAYS);
}

/** Sama seperti `minCutiStartDate`, tapi sebagai string "YYYY-MM-DD" untuk input form. */
export function minCutiStartDateInputValue(today: Date = getWorkDate()): string {
  return toDateInputValue(minCutiStartDate(today));
}

/**
 * Default tanggal mulai saat memilih Cuti: tanggal 1 bulan depan — kecuali
 * itu masih kurang dari `CUTI_MIN_ADVANCE_DAYS` dari hari ini (mis. hari ini
 * tanggal tua di akhir bulan), maka dibulatkan maju ke tanggal minimum supaya
 * defaultnya tidak pernah melanggar aturan minimum sendiri.
 */
export function defaultCutiStartDate(today: Date = getWorkDate()): Date {
  const firstOfNextMonth = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1),
  );
  const minStart = minCutiStartDate(today);

  return firstOfNextMonth < minStart ? minStart : firstOfNextMonth;
}

/**
 * Izin wajib diajukan H-2 — hari ini dan besok tidak bisa dipilih sebagai
 * tanggal mulai, supaya ada waktu approval sebelum tanggalnya tiba.
 */
export const IZIN_MIN_ADVANCE_DAYS = 2;

/** Tanggal mulai Izin paling cepat yang boleh diajukan, dihitung dari `today`. */
export function minIzinStartDate(today: Date = getWorkDate()): Date {
  return addDays(today, IZIN_MIN_ADVANCE_DAYS);
}

/** Sama seperti `minIzinStartDate`, tapi sebagai string "YYYY-MM-DD" untuk input form. */
export function minIzinStartDateInputValue(today: Date = getWorkDate()): string {
  return toDateInputValue(minIzinStartDate(today));
}

/** Jenis izin yang wajib melampirkan bukti (surat keterangan). */
export const LEAVE_TYPES_REQUIRING_ATTACHMENT: LeaveType[] = [LeaveType.SAKIT];
