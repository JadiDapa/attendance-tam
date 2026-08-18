import { Role, type User } from "@/generated/prisma";
import { AttendanceService } from "./attendance.service";
import { LeaveService } from "./leave.service";

/** Jumlah item yang perlu ditindak, dipetakan per URL menu sidebar. */
export type SidebarBadges = Record<string, number>;

/**
 * Angka merah di sidebar. Sengaja hanya menghitung hal yang benar-benar perlu
 * ditindak orang yang sedang login — bukan sekadar "ada yang baru" — supaya
 * angkanya tidak pernah jadi kebisingan yang diabaikan.
 */
export const NotificationService = {
  async forUser(user: User): Promise<SidebarBadges> {
    return user.role === Role.ADMIN ? this.forAdmin() : {};
  },

  /** Antrean admin: semuanya menunggu keputusan. */
  async forAdmin(): Promise<SidebarBadges> {
    const [leaves, attendanceApprovals] = await Promise.all([
      LeaveService.countPending(),
      AttendanceService.countPendingApproval(),
    ]);

    return {
      "/admin/izin": leaves,
      "/admin/verifikasi": attendanceApprovals,
    };
  },
};
