import { Role, type User } from "@/generated/prisma";
import { getMonthRange, getWorkDate } from "@/lib/date";
import { AttendanceService } from "./attendance.service";
import { CorrectionService } from "./correction.service";
import { LeaveService } from "./leave.service";
import { ReportService } from "./report.service";

/** Jumlah item yang perlu ditindak, dipetakan per URL menu sidebar. */
export type SidebarBadges = Record<string, number>;

/**
 * Angka merah di sidebar. Sengaja hanya menghitung hal yang benar-benar perlu
 * ditindak orang yang sedang login — bukan sekadar "ada yang baru" — supaya
 * angkanya tidak pernah jadi kebisingan yang diabaikan.
 */
export const NotificationService = {
  async forUser(user: User): Promise<SidebarBadges> {
    return user.role === Role.ADMIN
      ? this.forAdmin()
      : this.forEmployee(user.id);
  },

  /** Antrean admin: semuanya menunggu keputusan. */
  async forAdmin(): Promise<SidebarBadges> {
    const [leaves, corrections, radius] = await Promise.all([
      LeaveService.countPending(),
      CorrectionService.countPending(),
      AttendanceService.countPendingReview(),
    ]);

    return {
      "/admin/izin": leaves,
      "/admin/koreksi": corrections,
      "/admin/verifikasi": radius,
    };
  },

  /**
   * Karyawan: hari bulan ini yang absensinya menggantung atau terlewat.
   * Aturannya sama persis dengan panel "Perlu Dikoreksi" di halaman /koreksi.
   */
  async forEmployee(userId: string): Promise<SidebarBadges> {
    const today = getWorkDate();
    const month = getMonthRange(today);

    const rows = await ReportService.buildRecap({
      startDate: month.startDate,
      endDate: month.endDate,
      userId,
    });

    const needsAction = rows.filter(
      (row) =>
        row.missingCheckOut ||
        (row.status === "ALPA" && row.workDate.getTime() < today.getTime()),
    ).length;

    return { "/koreksi": needsAction };
  },
};
