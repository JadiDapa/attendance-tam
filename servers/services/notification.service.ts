import { LeaveStage, OvertimeStage, Role, type User } from "@/generated/prisma";
import { ownerRolesForAttendanceReviewer } from "@/lib/attendance";
import { AccountRequestService } from "./account-request.service";
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
        return this.forAdmin(user);
      case Role.SUPERVISOR:
        return this.forSupervisor();
      case Role.MANAGER:
        return this.forManager();
      default:
        return {};
    }
  },

  /**
   * Antrean admin: pengajuan akun baru + verifikasi absensi luar radius. Izin,
   * lembur, dan dinas luar tetap tidak lewat admin — giliran pertamanya selalu
   * SUPERVISOR (atau MANAGER kalau pemohonnya supervisor).
   */
  async forAdmin(user: User): Promise<SidebarBadges> {
    const [accountRequests, attendanceApprovals] = await Promise.all([
      AccountRequestService.countPending(),
      AttendanceService.countPendingApproval(user.id),
    ]);

    return {
      "/admin/permintaan-akun": accountRequests,
      "/admin/verifikasi": attendanceApprovals,
    };
  },

  /** Antrean supervisor: izin + lembur + verifikasi absensi di giliran supervisor. */
  async forSupervisor(): Promise<SidebarBadges> {
    const [leaves, overtimes, attendanceApprovals] = await Promise.all([
      LeaveService.countPending(LeaveStage.SUPERVISOR),
      OvertimeService.countPending(OvertimeStage.SUPERVISOR),
      AttendanceService.countPendingApprovalForOwnerRoles(
        ownerRolesForAttendanceReviewer(Role.SUPERVISOR),
      ),
    ]);

    return {
      "/supervisor/izin": leaves,
      "/supervisor/lembur": overtimes,
      "/supervisor/verifikasi": attendanceApprovals,
    };
  },

  /** Antrean manager: izin + lembur + dinas luar + verifikasi absensi milik supervisor. */
  async forManager(): Promise<SidebarBadges> {
    const [leaves, overtimes, fieldAssignments, attendanceApprovals] =
      await Promise.all([
        LeaveService.countPending(LeaveStage.MANAGER),
        OvertimeService.countPending(OvertimeStage.MANAGER),
        FieldAssignmentService.countPending(),
        AttendanceService.countPendingApprovalForOwnerRoles(
          ownerRolesForAttendanceReviewer(Role.MANAGER),
        ),
      ]);

    return {
      "/manager/izin": leaves,
      "/manager/lembur": overtimes,
      "/manager/dinas-luar": fieldAssignments,
      "/manager/verifikasi": attendanceApprovals,
    };
  },
};
