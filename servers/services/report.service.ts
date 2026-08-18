import {
  Attendance,
  AttendanceType,
  LeaveRequest,
  LeaveType,
  Role,
  User,
} from "@/generated/prisma";
import { eachDate, getWorkDate } from "@/lib/date";
import {
  isMissingCheckOut,
  isPendingApproval,
  isVoidedAttendance,
  statusFromCheckIn,
  type DayStatus,
} from "@/lib/attendance";
import { indexHolidays } from "@/lib/holiday";
import { isNonWorkingDate } from "@/lib/work-schedule";
import { UserService } from "./user.service";
import { AttendanceService } from "./attendance.service";
import { LeaveService } from "./leave.service";
import { HolidayService } from "./holiday.service";
import { WorkDayService } from "./setting.service";

/** Sengaja alias dari `DayStatus` supaya status di laporan dan di rekap harian tidak pernah berbeda. */
export type ReportStatus = DayStatus;

export type ReportRow = {
  workDate: Date;
  user: Pick<User, "id" | "name" | "email" | "position">;
  status: ReportStatus;
  leaveType: LeaveType | null;
  /** Nama hari libur kalau tanggal itu tanggal merah, mis. "Idul Fitri". */
  holidayName: string | null;
  /**
   * Absensi apa adanya — termasuk yang dianulir admin, supaya jejaknya tetap
   * terlihat. Yang menentukan angka rekap adalah `status`, bukan ada/tidaknya
   * baris ini.
   */
  checkIn: Attendance | null;
  checkOut: Attendance | null;
  /** Absen masuk ada, absen pulang tidak pernah tercatat, dan harinya sudah lewat. */
  missingCheckOut: boolean;
  /** Absensi luar radius yang masih menunggu keputusan admin. */
  pendingApproval: boolean;
};

export type ReportOptions = {
  startDate: Date;
  endDate: Date;
  userId?: string;
  /** "activity" hanya menyertakan hari yang ada absensi atau izin disetujui. */
  mode?: "all" | "activity";
};

function coversDate(leave: LeaveRequest, date: Date) {
  return (
    leave.startDate.getTime() <= date.getTime() &&
    leave.endDate.getTime() >= date.getTime()
  );
}

/** Kunci index absensi per karyawan per tanggal. */
function slot(userId: string, workDate: Date) {
  return `${userId}|${workDate.getTime()}`;
}

export const ReportService = {
  /** Rekap absensi per karyawan per hari — dipakai halaman laporan dan export CSV. */
  async buildRecap(options: ReportOptions): Promise<ReportRow[]> {
    const { startDate, endDate, userId, mode = "all" } = options;

    const [employees, attendances, leaves, holidays, workDays] =
      await Promise.all([
        // Karyawan nonaktif tidak ikut direkap — kalau ikut, mereka muncul
        // sebagai tidak absen setiap hari selamanya setelah berhenti.
        UserService.list({
          role: Role.EMPLOYEE,
          isActive: true,
          id: userId,
        }),
        AttendanceService.listByRange({ startDate, endDate, userId }),
        LeaveService.listApprovedInRange({ startDate, endDate, userId }),
        HolidayService.listInRange({ startDate, endDate }),
        WorkDayService.list(),
      ]);

    // Semua di-index sekali di depan — kalau di-filter di dalam loop, biayanya
    // jadi (hari × karyawan × total baris).
    const checkIns = new Map<string, Attendance>();
    const checkOuts = new Map<string, Attendance>();

    for (const item of attendances) {
      const map = item.type === AttendanceType.CHECK_IN ? checkIns : checkOuts;

      map.set(slot(item.userId, item.workDate), item);
    }

    const leavesByUser = new Map<string, LeaveRequest[]>();

    for (const leave of leaves) {
      const own = leavesByUser.get(leave.userId);

      if (own) own.push(leave);
      else leavesByUser.set(leave.userId, [leave]);
    }

    // Karyawan tidak bisa dianggap bolos sebelum akunnya ada.
    const joinDate = new Map(
      employees.map((employee) => [
        employee.id,
        getWorkDate(employee.createdAt).getTime(),
      ]),
    );

    const holidayByDate = indexHolidays(holidays);
    const today = getWorkDate();
    const rows: ReportRow[] = [];

    for (const date of eachDate(startDate, endDate)) {
      const holiday = holidayByDate.get(date.getTime()) ?? null;
      // Tanggal merah mengalahkan pola mingguan: hari kerja biasa yang jatuh
      // pada hari libur nasional tetap dihitung libur.
      const isDayOff = holiday !== null || isNonWorkingDate(date, workDays);

      for (const employee of employees) {
        if (date.getTime() < (joinDate.get(employee.id) ?? 0)) continue;

        const key = slot(employee.id, date);
        const checkIn = checkIns.get(key) ?? null;
        const checkOut = checkOuts.get(key) ?? null;
        const leave =
          leavesByUser
            .get(employee.id)
            ?.find((item) => coversDate(item, date)) ?? null;

        if (mode === "activity" && !checkIn && !checkOut && !leave) continue;

        // Absensi yang dianulir admin diperlakukan seolah tidak pernah ada.
        const effectiveCheckIn = isVoidedAttendance(checkIn) ? null : checkIn;
        const effectiveCheckOut = isVoidedAttendance(checkOut)
          ? null
          : checkOut;

        // Urutan sengaja: absen menang atas izin (kalau karyawan tetap datang
        // dia dihitung hadir), dan izin menang atas libur supaya jatah izin
        // yang sudah disetujui tetap terlihat. `LeaveType` sengaja sama persis
        // dengan tiga status izin, jadi jenisnya terbawa apa adanya.
        let status: ReportStatus = "ALFA";

        if (effectiveCheckIn) status = statusFromCheckIn(effectiveCheckIn);
        else if (leave) status = leave.type;
        else if (isDayOff) status = "LIBUR";

        rows.push({
          workDate: date,
          user: {
            id: employee.id,
            name: employee.name,
            email: employee.email,
            position: employee.position,
          },
          status,
          leaveType: leave?.type ?? null,
          holidayName: holiday?.name ?? null,
          checkIn,
          checkOut,
          missingCheckOut: isMissingCheckOut({
            hasCheckIn: effectiveCheckIn !== null,
            hasCheckOut: effectiveCheckOut !== null,
            workDate: date,
            today,
          }),
          pendingApproval:
            isPendingApproval(checkIn) || isPendingApproval(checkOut),
        });
      }
    }

    return rows;
  },
};
