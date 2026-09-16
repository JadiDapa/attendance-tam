import { Role } from "@/generated/prisma";
import { getWorkDate } from "@/lib/date";
import { indexHolidays } from "@/lib/holiday";
import { isNonWorkingDate } from "@/lib/work-schedule";
import { UserService } from "./user.service";
import { ReportService } from "./report.service";
import { EmploymentDataService } from "./employee-profile.service";
import { OvertimeService } from "./overtime.service";
import { HolidayService } from "./holiday.service";
import { WorkDayService } from "./setting.service";

/** Satu baris "Rekap Absensi Karyawan" — persis kolom absensi di template Excel. */
export type MonthlyAttendanceRow = {
  no: number;
  nip: string;
  name: string;
  hadir: number;
  telat: number;
  /** Total menit terlambat, tanpa toleransi — tetap terhitung walau `telat` 0. */
  telatMenit: number;
  /** Sistem belum punya mode kerja WFH — selalu 0. */
  wfh: number;
  dinasLuar: number;
  sakit: number;
  izin: number;
  alfa: number;
  cuti: number;
  lemburHarianMinutes: number;
  lemburLiburMinutes: number;
};

type Counts = {
  hadir: number;
  telat: number;
  telatMenit: number;
  dinasLuar: number;
  sakit: number;
  izin: number;
  alfa: number;
  cuti: number;
};

function emptyCounts(): Counts {
  return {
    hadir: 0,
    telat: 0,
    telatMenit: 0,
    dinasLuar: 0,
    sakit: 0,
    izin: 0,
    alfa: 0,
    cuti: 0,
  };
}

export const MonthlyReportService = {
  /** Rekap absensi per karyawan untuk satu rentang tanggal — dipakai export Excel bulanan. */
  async buildAttendanceRecap(options: {
    startDate: Date;
    endDate: Date;
  }): Promise<MonthlyAttendanceRow[]> {
    const { startDate, endDate } = options;
    const today = getWorkDate();

    const [employees, recapRows, holidays, workDays, overtimes] =
      await Promise.all([
        UserService.list({ role: Role.EMPLOYEE, isActive: true }),
        ReportService.buildRecap({ startDate, endDate }),
        HolidayService.listInRange({ startDate, endDate }),
        WorkDayService.list(),
        OvertimeService.listApprovedInRange({ startDate, endDate }),
      ]);

    const employmentData = await EmploymentDataService.listByUserIds(
      employees.map((employee) => employee.id),
    );
    const nipByUser = new Map(
      employmentData.map((item) => [item.userId, item.employeeNumber]),
    );

    const countsByUser = new Map<string, Counts>();

    for (const row of recapRows) {
      const counts = countsByUser.get(row.user.id) ?? emptyCounts();

      if (row.status === "HADIR_DIKANTOR") {
        counts.hadir += 1;
        if (row.checkIn?.isLate) counts.telat += 1;
        // Menitnya tetap direkap walau di bawah toleransi (`isLate` false) —
        // dipakai untuk menilai performa, bukan cuma yang lewat ambang batas.
        if (row.checkIn) counts.telatMenit += row.checkIn.lateMinutes;
      }
      // Kolom Excel "Dinas Luar" ikut template lama yang tidak membedakan
      // klaim luar radius (`WorkMode.LUAR_RADIUS`) dari penugasan dinas luar
      // yang sudah direncanakan (`FieldAssignment` → `DINAS_LUAR`) — beda dari
      // tampilan web yang sudah memisahkan keduanya (lihat `lib/attendance.ts`).
      if (row.status === "LUAR_RADIUS" || row.status === "DINAS_LUAR") {
        counts.dinasLuar += 1;
      }
      if (row.status === "SAKIT") counts.sakit += 1;
      if (row.status === "IZIN") counts.izin += 1;
      if (row.status === "CUTI") counts.cuti += 1;

      // Hari berjalan belum lewat belum bisa disebut bolos — sama seperti
      // logika di halaman Rekapan Kehadiran.
      if (row.status === "ALFA" && row.workDate.getTime() < today.getTime()) {
        counts.alfa += 1;
      }

      countsByUser.set(row.user.id, counts);
    }

    // Lembur di hari kerja biasa dihitung "Lembur Harian"; lembur di tanggal
    // merah atau hari libur mingguan dihitung "Lembur Libur" — sama seperti
    // klasifikasi hari libur di `ReportService.buildRecap`.
    const holidayByDate = indexHolidays(holidays);
    const overtimeByUser = new Map<
      string,
      { harian: number; libur: number }
    >();

    for (const overtime of overtimes) {
      const isDayOff =
        holidayByDate.has(overtime.workDate.getTime()) ||
        isNonWorkingDate(overtime.workDate, workDays);
      const own = overtimeByUser.get(overtime.userId) ?? {
        harian: 0,
        libur: 0,
      };
      const minutes = overtime.durationMinutes ?? 0;

      if (isDayOff) own.libur += minutes;
      else own.harian += minutes;

      overtimeByUser.set(overtime.userId, own);
    }

    return employees.map((employee, index) => {
      const counts = countsByUser.get(employee.id) ?? emptyCounts();
      const overtime = overtimeByUser.get(employee.id) ?? {
        harian: 0,
        libur: 0,
      };

      return {
        no: index + 1,
        nip: nipByUser.get(employee.id) ?? "",
        name: employee.name,
        wfh: 0,
        ...counts,
        lemburHarianMinutes: overtime.harian,
        lemburLiburMinutes: overtime.libur,
      };
    });
  },
};
