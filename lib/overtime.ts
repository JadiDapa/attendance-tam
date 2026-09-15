import { AttendanceApproval, OvertimeStage, Role } from "@/generated/prisma";

export const OVERTIME_STAGE_LABEL: Record<OvertimeStage, string> = {
  SUPERVISOR: "Menunggu Supervisor",
  MANAGER: "Menunggu Manager",
  DONE: "Selesai",
};

/** Lembur baru boleh dimulai pukul 18:00 waktu lokal atau lebih larut. */
export const MIN_OVERTIME_HOUR = 18;

/** `minutesOfDay` dari `getMinutesOfDay()` — true kalau >= 18:00. */
export function isOvertimeStartAllowed(minutesOfDay: number): boolean {
  return minutesOfDay >= MIN_OVERTIME_HOUR * 60;
}

/** Role reviewer -> giliran approval yang boleh mereka putuskan. */
export const OVERTIME_REVIEWER_STAGE: Partial<Record<Role, OvertimeStage>> = {
  [Role.SUPERVISOR]: OvertimeStage.SUPERVISOR,
  [Role.MANAGER]: OvertimeStage.MANAGER,
};

/**
 * Approval lembur selalu satu langkah saja (tidak berjenjang) — begitu
 * reviewer di `stage` saat ini memutuskan, pengajuan langsung selesai.
 */
export function nextOvertimeStage(): OvertimeStage {
  return OvertimeStage.DONE;
}

export type InitialOvertimeState = {
  stage: OvertimeStage;
  status: AttendanceApproval;
  reviewNote: string | null;
  reviewedAt: Date | null;
  message: string;
};

/**
 * Giliran approval awal pengajuan lembur, tergantung role pemohon — satu
 * langkah saja:
 * - Karyawan & admin: menunggu SUPERVISOR.
 * - Supervisor: tidak ada supervisor lain di atasnya, jadi menunggu MANAGER.
 * - Manager: tidak ada lagi yang perlu menyetujui, jadi langsung disetujui
 *   otomatis — tetap tercatat untuk oversight.
 */
export function resolveInitialOvertime(role: Role): InitialOvertimeState {
  if (role === Role.MANAGER) {
    return {
      stage: OvertimeStage.DONE,
      status: AttendanceApproval.APPROVED,
      reviewNote: "Disetujui otomatis — pengajuan lembur manager",
      reviewedAt: new Date(),
      message: "Lembur dimulai dan otomatis disetujui",
    };
  }

  if (role === Role.SUPERVISOR) {
    return {
      stage: OvertimeStage.MANAGER,
      status: AttendanceApproval.PENDING,
      reviewNote: null,
      reviewedAt: null,
      message: "Lembur dimulai, menunggu persetujuan manager",
    };
  }

  return {
    stage: OvertimeStage.SUPERVISOR,
    status: AttendanceApproval.PENDING,
    reviewNote: null,
    reviewedAt: null,
    message: "Lembur dimulai, menunggu persetujuan supervisor",
  };
}
