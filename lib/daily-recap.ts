/**
 * Perakit rekap kehadiran satu hari.
 *
 * Dipakai bersama oleh halaman Kehadiran (tabel + filter status) dan Dashboard
 * admin (ringkasan) supaya angka di keduanya tidak pernah berbeda.
 *
 * Dipakai dari server component saja — mengimpor enum dari Prisma client.
 */

import {
  AttendanceType,
  type Attendance,
  type LeaveRequest,
  type User,
} from "@/generated/prisma";
import {
  DAY_STATUS_OPTIONS,
  isMissingCheckOut,
  isPendingApproval,
  isVoidedAttendance,
  statusFromCheckIn,
  toRecapEntry,
  type DayStatus,
  type RecapRow,
} from "./attendance";
import { LEAVE_TYPE_LABEL } from "./leave";
import { APPROVAL_LABEL } from "./work-mode";

export type RecapCounts = Record<DayStatus, number>;

/** Satu baris per karyawan: status hari itu + absen masuk/pulang kalau ada. */
export function buildDailyRecap(input: {
  employees: User[];
  attendances: Attendance[];
  approvedLeaves: LeaveRequest[];
  /** Tanggal yang sedang dilihat. */
  workDate: Date;
  /** Tanggal kerja hari ini — hari berjalan belum dihitung menggantung. */
  today: Date;
  /** Libur menurut pola mingguan atau tanggal merah. */
  isDayOff: boolean;
  /** Nama hari libur kalau tanggal itu tanggal merah. */
  holidayName?: string | null;
}): RecapRow[] {
  const {
    employees,
    attendances,
    approvedLeaves,
    workDate,
    today,
    isDayOff,
    holidayName = null,
  } = input;

  return employees.map((employee) => {
    const own = attendances.filter((item) => item.userId === employee.id);
    const checkIn =
      own.find((item) => item.type === AttendanceType.CHECK_IN) ?? null;
    const checkOut =
      own.find((item) => item.type === AttendanceType.CHECK_OUT) ?? null;
    const leave = approvedLeaves.find((item) => item.userId === employee.id);

    // Absensi yang ditolak admin diperlakukan seolah tidak pernah ada.
    const effectiveCheckIn = isVoidedAttendance(checkIn) ? null : checkIn;
    const effectiveCheckOut = isVoidedAttendance(checkOut) ? null : checkOut;

    let status: DayStatus = "ALFA";
    let statusDetail: string | null = null;

    // Absen tetap menang atas izin: kalau karyawan datang, dia dihitung hadir.
    if (effectiveCheckIn) {
      status = statusFromCheckIn(effectiveCheckIn);
      statusDetail = isPendingApproval(effectiveCheckIn)
        ? APPROVAL_LABEL.PENDING
        : effectiveCheckIn.workModeDetail;
    } else if (leave) {
      status = leave.type;
      statusDetail = LEAVE_TYPE_LABEL[leave.type];
    } else if (isDayOff) {
      status = "LIBUR";
      statusDetail = holidayName;
    } else if (checkIn) {
      // Absensinya ada tapi ditolak admin — jelaskan kenapa harinya jadi Alfa.
      statusDetail = APPROVAL_LABEL.REJECTED;
    }

    return {
      userId: employee.id,
      name: employee.name,
      position: employee.position ?? "",
      status,
      statusDetail,
      checkIn: checkIn ? toRecapEntry("Absen Masuk", checkIn) : null,
      checkOut: checkOut ? toRecapEntry("Absen Pulang", checkOut) : null,
      missingCheckOut: isMissingCheckOut({
        hasCheckIn: effectiveCheckIn !== null,
        hasCheckOut: effectiveCheckOut !== null,
        workDate,
        today,
      }),
      pendingApproval:
        isPendingApproval(checkIn) || isPendingApproval(checkOut),
    };
  });
}

export function countRecapStatus(rows: RecapRow[]): RecapCounts {
  const counts = Object.fromEntries(
    DAY_STATUS_OPTIONS.map((status) => [status, 0]),
  ) as RecapCounts;

  for (const row of rows) counts[row.status] += 1;

  return counts;
}

/** Hari yang dihitung hadir bekerja: di kantor, WFH, atau dinas luar. */
export function countPresent(counts: RecapCounts): number {
  return counts.HADIR_DIKANTOR + counts.WFH + counts.DINAS_LUAR;
}
