import {
  Attendance,
  AttendanceType,
  FieldAssignment,
  LeaveRequest,
  LeaveType,
  Role,
  User,
} from "@/generated/prisma";
import { eachDate, getWorkDate, rangeCoversDate } from "@/lib/date";
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
import { FieldAssignmentService } from "./field-assignment.service";
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

function coversDate(entity: LeaveRequest | FieldAssignment, date: Date) {
  return rangeCoversDate(entity.startDate, entity.endDate, date);
}

/** Kunci index absensi per karyawan per tanggal. */
function slot(userId: string, workDate: Date) {
  return `${userId}|${workDate.getTime()}`;
}

export const ReportService = {
  /** Rekap absensi per karyawan per hari — dipakai halaman laporan dan export CSV. */
  async buildRecap(options: ReportOptions): Promise<ReportRow[]> {
    const { startDate, endDate, userId, mode = "all" } = options;

    const [employees, attendances, leaves, fieldAssignments, holidays, workDays] =
      await Promise.all([
        // Karyawan nonaktif tidak ikut direkap — kalau ikut, mereka muncul
        // sebagai tidak absen setiap hari selamanya setelah berhenti. Filter
        // role EMPLOYEE cuma berlaku untuk rekap seluruh karyawan (userId
        // kosong) — kalau userId diisi (rekap satu orang, mis. "Absensi
        // Saya" admin/supervisor/manager), role apa pun boleh direkap.
        UserService.list({
          role: userId ? undefined : Role.EMPLOYEE,
          isActive: true,
          id: userId,
        }),
        AttendanceService.listByRange({ startDate, endDate, userId }),
        LeaveService.listApprovedInRange({ startDate, endDate, userId }),
        FieldAssignmentService.listApprovedInRange({
          startDate,
          endDate,
          userId,
        }),
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

    const fieldAssignmentsByUser = new Map<
      string,
      (FieldAssignment & { employees: { id: string }[] })[]
    >();

    for (const assignment of fieldAssignments) {
      for (const { id: employeeId } of assignment.employees) {
        const own = fieldAssignmentsByUser.get(employeeId);

        if (own) own.push(assignment);
        else fieldAssignmentsByUser.set(employeeId, [assignment]);
      }
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
        const fieldAssignment =
          fieldAssignmentsByUser
            .get(employee.id)
            ?.find((item) => coversDate(item, date)) ?? null;

        if (
          mode === "activity" &&
          !checkIn &&
          !checkOut &&
          !leave &&
          !fieldAssignment
        )
          continue;

        // Absensi yang dianulir admin diperlakukan seolah tidak pernah ada.
        const effectiveCheckIn = isVoidedAttendance(checkIn) ? null : checkIn;
        const effectiveCheckOut = isVoidedAttendance(checkOut)
          ? null
          : checkOut;

        // Urutan sengaja: absen menang atas izin/dinas luar (kalau karyawan
        // tetap datang dia dihitung hadir), izin menang atas dinas luar dan
        // keduanya menang atas libur supaya jatah yang sudah disetujui tetap
        // terlihat. `LeaveType` sengaja sama persis dengan tiga status izin,
        // jadi jenisnya terbawa apa adanya. Dinas luar yang disetujui tidak
        // menuntut absen sama sekali — bukan klaim mandiri saat check-in
        // seperti `WorkMode.LUAR_RADIUS` biasa, tapi penugasan yang sudah
        // direncanakan lewat `FieldAssignment`. Status "DINAS_LUAR" di sini
        // hanya pernah muncul lewat jalur ini (tanpa check-in) — kalau ada
        // check-in luar radius, statusnya "LUAR_RADIUS" lewat `statusFromCheckIn`.
        let status: ReportStatus = "ALFA";

        if (effectiveCheckIn) status = statusFromCheckIn(effectiveCheckIn);
        else if (leave) status = leave.type;
        else if (fieldAssignment) status = "DINAS_LUAR";
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
