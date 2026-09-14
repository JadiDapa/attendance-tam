import { LeaveStage, OvertimeStage, Role, type User } from "@/generated/prisma";
import { AttendanceService } from "./attendance.service";
import { FieldAssignmentService } from "./field-assignment.service";
import { LeaveService } from "./leave.service";
import { OvertimeService } from "./overtime.service";

/** Jumlah item yang perlu ditindak, dipetakan per URL menu sidebar. */
export type SidebarBadges = Record<string, number>;

/**
 * Angka merah di sidebar. Sengaja hanya menghitung hal yang benar-benar perlu
 * ditindak orang yang sedang login — bukan sekadar "ada yang baru" — supaya
 * angkanya tidak pernah jadi kebisingan yang diabaikan.
 */
export const NotificationService = {
  async forUser(user: User): Promise<SidebarBadges> {
    switch (user.role) {
      case Role.ADMIN:
        return this.forAdmin();
      case Role.SUPERVISOR:
        return this.forSupervisor();
      case Role.MANAGER:
        return this.forManager();
      default:
        return {};
    }
  },

  /** Antrean admin: pengajuan izin + persetujuan dinas luar di giliran admin + approval absensi + pengajuan lembur. */
  async forAdmin(): Promise<SidebarBadges> {
    const [leaves, attendanceApprovals, overtimes, fieldAssignments] =
      await Promise.all([
        LeaveService.countPending(LeaveStage.ADMIN),
        AttendanceService.countPendingApproval(),
        OvertimeService.countPending(OvertimeStage.ADMIN),
        FieldAssignmentService.countPending(),
      ]);

    return {
      "/admin/izin": leaves,
      "/admin/verifikasi": attendanceApprovals,
      "/admin/lembur": overtimes,
      "/admin/dinas-luar": fieldAssignments,
    };
  },

  /** Antrean supervisor: pengajuan izin + pengajuan lembur yang sudah sampai giliran supervisor. */
  async forSupervisor(): Promise<SidebarBadges> {
    const [leaves, overtimes] = await Promise.all([
      LeaveService.countPending(LeaveStage.SUPERVISOR),
      OvertimeService.countPending(OvertimeStage.SUPERVISOR),
    ]);

    return {
      "/supervisor/izin": leaves,
      "/supervisor/lembur": overtimes,
    };
  },

  /** Antrean manager: pengajuan izin di giliran manager. */
  async forManager(): Promise<SidebarBadges> {
    const leaves = await LeaveService.countPending(LeaveStage.MANAGER);

    return {
      "/manager/izin": leaves,
    };
  },
};
