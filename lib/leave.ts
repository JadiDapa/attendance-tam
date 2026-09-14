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
  [Role.ADMIN]: LeaveStage.ADMIN,
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
  ADMIN: "Menunggu Admin",
  SUPERVISOR: "Menunggu Supervisor",
  MANAGER: "Menunggu Manager",
  DONE: "Selesai",
};

/**
 * Urutan approval per jenis izin. `SAKIT` selesai satu langkah di admin;
 * `IZIN`/`CUTI` berjalan ADMIN -> SUPERVISOR -> MANAGER -> DONE. Satu-satunya
 * tempat yang tahu urutan ini — jangan duplikasi di service/action lain.
 */
export const LEAVE_APPROVAL_CHAIN: Record<LeaveType, LeaveStage[]> = {
  SAKIT: [LeaveStage.ADMIN, LeaveStage.DONE],
  IZIN: [
    LeaveStage.ADMIN,
    LeaveStage.SUPERVISOR,
    LeaveStage.MANAGER,
    LeaveStage.DONE,
  ],
  CUTI: [
    LeaveStage.ADMIN,
    LeaveStage.SUPERVISOR,
    LeaveStage.MANAGER,
    LeaveStage.DONE,
  ],
};

/** Giliran berikutnya setelah `stage` menyetujui pengajuan bertipe `type`. */
export function nextLeaveStage(type: LeaveType, stage: LeaveStage): LeaveStage {
  const chain = LEAVE_APPROVAL_CHAIN[type];
  const index = chain.indexOf(stage);

  return index === -1 ? LeaveStage.DONE : (chain[index + 1] ?? LeaveStage.DONE);
}

/** Jumlah hari pengajuan (inklusif). Kedua tanggal adalah kolom `date` UTC. */
export function countLeaveDays(startDate: Date, endDate: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;

  return Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;
}

/**
 * Cuti wajib diajukan jauh-jauh hari — 30 hari ke depan tidak bisa dipilih
 * sebagai tanggal mulai, supaya ada waktu approval berjenjang
 * (Admin -> Supervisor -> Manager) sebelum tanggalnya tiba.
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

/** Jenis izin yang wajib melampirkan bukti (surat keterangan). */
export const LEAVE_TYPES_REQUIRING_ATTACHMENT: LeaveType[] = [LeaveType.SAKIT];
