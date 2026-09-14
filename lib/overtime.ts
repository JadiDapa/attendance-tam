import { AttendanceApproval, OvertimeStage, Role } from "@/generated/prisma";

export const OVERTIME_STAGE_LABEL: Record<OvertimeStage, string> = {
  ADMIN: "Menunggu Admin",
  SUPERVISOR: "Menunggu Supervisor",
  DONE: "Selesai",
};

/** Lembur baru boleh dimulai pukul 18:00 waktu lokal atau lebih larut. */
export const MIN_OVERTIME_HOUR = 18;

/** `minutesOfDay` dari `getMinutesOfDay()` — true kalau >= 18:00. */
export function isOvertimeStartAllowed(minutesOfDay: number): boolean {
  return minutesOfDay >= MIN_OVERTIME_HOUR * 60;
}

/** Giliran approval: ADMIN -> SUPERVISOR -> DONE. Tidak ada percabangan per jenis, beda dari izin. */
const OVERTIME_APPROVAL_CHAIN: OvertimeStage[] = [
  OvertimeStage.ADMIN,
  OvertimeStage.SUPERVISOR,
  OvertimeStage.DONE,
];

/** Role reviewer -> giliran approval yang boleh mereka putuskan. */
export const OVERTIME_REVIEWER_STAGE: Partial<Record<Role, OvertimeStage>> = {
  [Role.ADMIN]: OvertimeStage.ADMIN,
  [Role.SUPERVISOR]: OvertimeStage.SUPERVISOR,
};

/** Giliran berikutnya setelah `stage` menyetujui pengajuan lembur. */
export function nextOvertimeStage(stage: OvertimeStage): OvertimeStage {
  const index = OVERTIME_APPROVAL_CHAIN.indexOf(stage);

  return index === -1
    ? OvertimeStage.DONE
    : (OVERTIME_APPROVAL_CHAIN[index + 1] ?? OvertimeStage.DONE);
}

export type InitialOvertimeState = {
  stage: OvertimeStage;
  status: AttendanceApproval;
  reviewNote: string | null;
  reviewedAt: Date | null;
  message: string;
};

/**
 * Giliran approval awal pengajuan lembur, tergantung role pemohon:
 * - Karyawan: lewat ADMIN dulu, lalu SUPERVISOR (rantai normal).
 * - Admin: admin tidak bisa menyetujui pengajuannya sendiri, jadi langsung
 *   masuk giliran SUPERVISOR.
 * - Supervisor: tidak ada lagi yang perlu menyetujui (di atas rantai lembur
 *   cuma ada admin & supervisor), jadi langsung disetujui otomatis — tetap
 *   tercatat untuk terlihat oleh manager sebagai oversight.
 */
export function resolveInitialOvertime(role: Role): InitialOvertimeState {
  if (role === Role.SUPERVISOR) {
    return {
      stage: OvertimeStage.DONE,
      status: AttendanceApproval.APPROVED,
      reviewNote: "Disetujui otomatis — pengajuan lembur supervisor",
      reviewedAt: new Date(),
      message: "Lembur dimulai dan otomatis disetujui",
    };
  }

  if (role === Role.ADMIN) {
    return {
      stage: OvertimeStage.SUPERVISOR,
      status: AttendanceApproval.PENDING,
      reviewNote: null,
      reviewedAt: null,
      message: "Lembur dimulai, menunggu persetujuan supervisor",
    };
  }

  return {
    stage: OvertimeStage.ADMIN,
    status: AttendanceApproval.PENDING,
    reviewNote: null,
    reviewedAt: null,
    message: "Lembur dimulai, menunggu persetujuan admin",
  };
}
