import prisma from "@/lib/prisma";
import {
  AttendanceApproval,
  LeaveStage,
  LeaveStatus,
  OvertimeStage,
  Prisma,
  Role,
} from "@/generated/prisma";
import {
  canReviewRequest,
  canViewRequest,
  getApprovalScope,
  type ApprovalScope,
  type RoutingReviewer,
  type RoutingTarget,
} from "@/lib/approval-routing";
import {
  ownerRolesForAttendanceReviewer,
  resolveAttendanceReviewerRole,
} from "@/lib/attendance";

/**
 * Potongan filter per jenis Pengajuan yang dirakit `buildWhereForScope`.
 * `W` = `Prisma.<Model>WhereInput` milik jenis itu.
 */
type ScopeWhereParts<W> = {
  /** Masih menunggu keputusan. */
  pending: W;
  /** Tahap MANAGER. */
  managerStage: W;
  /** Tahap SUPERVISOR, opsional disaring ke pemohon yang cocok `requester`. */
  supervisorStage: (requester?: Prisma.UserWhereInput) => W;
  /** Saring ke pemohon yang cocok `requester`. */
  requester: (requester: Prisma.UserWhereInput) => W;
};

/**
 * Satu-satunya terjemahan `ApprovalScope` → filter Prisma (lihat tabel di
 * `docs/approval-routing.md`); izin, lembur, dan absen luar radius hanya
 * berbeda di potongan per tahapnya.
 */
function buildWhereForScope<W extends object>(
  scope: ApprovalScope,
  parts: ScopeWhereParts<W>,
): W {
  switch (scope.kind) {
    case "none":
      return { id: "__none__" } as W;
    case "all":
      return { ...parts.pending, ...parts.supervisorStage() };
    case "division":
      return {
        ...parts.pending,
        ...parts.supervisorStage(),
        OR: [
          parts.requester({ jobPosition: { divisionId: scope.divisionId } }),
          parts.requester({ positionId: null }),
        ],
      };
    case "manager":
      if (scope.orphanDivisionIds.length === 0) {
        return { ...parts.pending, ...parts.managerStage };
      }
      return {
        ...parts.pending,
        OR: [
          parts.managerStage,
          parts.supervisorStage({
            jobPosition: { divisionId: { in: scope.orphanDivisionIds } },
          }),
        ],
      };
  }
}

const byRequester = (requester: Prisma.UserWhereInput) => ({ user: requester });

/**
 * Filter Prisma untuk pengajuan izin pending sesuai cakupan reviewer.
 */
export function buildLeaveWhereForScope(
  scope: ApprovalScope,
): Prisma.LeaveRequestWhereInput {
  return buildWhereForScope<Prisma.LeaveRequestWhereInput>(scope, {
    pending: { status: LeaveStatus.PENDING },
    managerStage: { stage: LeaveStage.MANAGER },
    supervisorStage: (requester) => ({
      stage: LeaveStage.SUPERVISOR,
      ...(requester && { user: requester }),
    }),
    requester: byRequester,
  });
}

/**
 * Filter Prisma untuk pengajuan lembur pending sesuai cakupan reviewer.
 */
export function buildOvertimeWhereForScope(
  scope: ApprovalScope,
): Prisma.OvertimeWhereInput {
  return buildWhereForScope<Prisma.OvertimeWhereInput>(scope, {
    pending: { status: AttendanceApproval.PENDING },
    managerStage: { stage: OvertimeStage.MANAGER },
    supervisorStage: (requester) => ({
      stage: OvertimeStage.SUPERVISOR,
      ...(requester && { user: requester }),
    }),
    requester: byRequester,
  });
}

/**
 * Cakupan antrean absen luar radius: cakupan routing biasa, plus `admin` —
 * Admin memutuskan absensi Role mana pun (kecuali miliknya sendiri, disaring
 * pemanggil lewat `excludeUserId`). Dibuat `getAttendanceScopeForReviewer()`.
 */
export type AttendanceScope = ApprovalScope | { kind: "admin" };

/**
 * Filter Prisma untuk absen luar radius pending sesuai cakupan reviewer.
 * `Attendance` tidak punya kolom tahap: tahapnya diturunkan dari Role pemilik
 * (`ownerRolesForAttendanceReviewer`) — karyawan/admin di tahap SUPERVISOR,
 * supervisor di tahap MANAGER. Cakupan Divisi ditumpuk di atasnya.
 */
export function buildAttendanceWhereForScope(
  scope: AttendanceScope,
): Prisma.AttendanceWhereInput {
  const pending = { approvalStatus: AttendanceApproval.PENDING };

  if (scope.kind === "admin") return pending;

  return buildWhereForScope<Prisma.AttendanceWhereInput>(scope, {
    pending,
    managerStage: {
      user: { role: { in: ownerRolesForAttendanceReviewer(Role.MANAGER) } },
    },
    supervisorStage: (requester) => ({
      user: {
        role: { in: ownerRolesForAttendanceReviewer(Role.SUPERVISOR) },
        ...requester,
      },
    }),
    requester: byRequester,
  });
}

/**
 * Filter Prisma untuk daftar pengajuan izin yang boleh dilihat seorang viewer di desktop
 * (termasuk riwayat yang sudah selesai).
 */
export function buildLeaveWhereForViewer(viewer: {
  divisionId?: string | null;
}): Prisma.LeaveRequestWhereInput {
  if (!viewer.divisionId) {
    return {};
  }
  return {
    OR: [
      { user: { jobPosition: { divisionId: viewer.divisionId } } },
      { user: { positionId: null } },
    ],
  };
}

/**
 * Filter Prisma untuk daftar pengajuan lembur yang boleh dilihat seorang viewer di desktop
 * (termasuk riwayat yang sudah selesai).
 */
export function buildOvertimeWhereForViewer(viewer: {
  divisionId?: string | null;
}): Prisma.OvertimeWhereInput {
  if (!viewer.divisionId) {
    return {};
  }
  return {
    OR: [
      { user: { jobPosition: { divisionId: viewer.divisionId } } },
      { user: { positionId: null } },
    ],
  };
}

export const ApprovalRoutingService = {
  /**
   * Menemukan divisionId untuk user (dibaca dari Jabatannya, ADR 0001).
   */
  async getUserDivisionId(user: {
    id?: string;
    positionId?: string | null;
  }): Promise<string | null> {
    if (user.positionId === null) return null;

    if (user.positionId) {
      const position = await prisma.position.findUnique({
        where: { id: user.positionId },
        select: { divisionId: true },
      });
      return position?.divisionId ?? null;
    }

    if (user.id) {
      const u = await prisma.user.findUnique({
        where: { id: user.id },
        select: { jobPosition: { select: { divisionId: true } } },
      });
      return u?.jobPosition?.divisionId ?? null;
    }

    return null;
  },

  /**
   * Himpunan id Divisi yang punya Supervisor Divisi aktif.
   */
  async getActiveSupervisorDivisionIds(): Promise<Set<string>> {
    const supervisors = await prisma.user.findMany({
      where: {
        role: Role.SUPERVISOR,
        isActive: true,
        positionId: { not: null },
      },
      select: {
        jobPosition: { select: { divisionId: true } },
      },
    });

    const divisionIds = new Set<string>();
    for (const spv of supervisors) {
      if (spv.jobPosition?.divisionId) {
        divisionIds.add(spv.jobPosition.divisionId);
      }
    }
    return divisionIds;
  },

  /**
   * Semua id Divisi yang ada di sistem.
   */
  async getAllDivisionIds(): Promise<string[]> {
    const divisions = await prisma.division.findMany({
      select: { id: true },
    });
    return divisions.map((d) => d.id);
  },

  /**
   * Mendapatkan cakupan persetujuan untuk reviewer tertentu.
   */
  async getScopeForReviewer(user: {
    id?: string;
    role: Role | string;
    positionId?: string | null;
  }): Promise<ApprovalScope> {
    const isManager = user.role === Role.MANAGER || user.role === "MANAGER";

    const [divisionId, allDivisionIds, activeSupervisorDivisionIds] =
      await Promise.all([
        this.getUserDivisionId(user),
        isManager ? this.getAllDivisionIds() : Promise.resolve([]),
        isManager ? this.getActiveSupervisorDivisionIds() : Promise.resolve(new Set<string>()),
      ]);

    return getApprovalScope({
      reviewer: { role: user.role, divisionId },
      allDivisionIds,
      activeSupervisorDivisionIds,
    });
  },

  /**
   * Cakupan antrean absen luar radius untuk reviewer: ADMIN → `admin` (semua
   * Role), selain itu cakupan routing biasa. Satu-satunya tempat aturan
   * "Admin memutuskan absensi siapa pun" untuk antrean.
   */
  async getAttendanceScopeForReviewer(user: {
    id?: string;
    role: Role | string;
    positionId?: string | null;
  }): Promise<AttendanceScope> {
    if (user.role === Role.ADMIN) return { kind: "admin" };
    return this.getScopeForReviewer(user);
  },

  /**
   * Cek apakah reviewer berhak memutuskan pengajuan target.
   */
  async canReview(params: {
    reviewer: {
      id?: string;
      role: Role | string;
      positionId?: string | null;
    };
    target: {
      requesterRole?: Role | string;
      requesterDivisionId?: string | null;
      requesterPositionId?: string | null;
      stage: string;
    };
  }): Promise<boolean> {
    const isManager =
      params.reviewer.role === Role.MANAGER ||
      params.reviewer.role === "MANAGER";

    const [reviewerDivisionId, activeSupervisorDivisionIds] = await Promise.all([
      this.getUserDivisionId(params.reviewer),
      isManager ? this.getActiveSupervisorDivisionIds() : Promise.resolve(new Set<string>()),
    ]);

    let requesterDivisionId = params.target.requesterDivisionId;
    if (
      requesterDivisionId === undefined &&
      params.target.requesterPositionId !== undefined
    ) {
      requesterDivisionId = await this.getUserDivisionId({
        positionId: params.target.requesterPositionId,
      });
    }

    const reviewer: RoutingReviewer = {
      role: params.reviewer.role,
      divisionId: reviewerDivisionId,
    };

    const target: RoutingTarget = {
      requesterRole: params.target.requesterRole,
      requesterDivisionId,
      stage: params.target.stage,
    };

    return canReviewRequest({
      reviewer,
      target,
      activeSupervisorDivisionIds,
    });
  },

  /**
   * Helper ringkas untuk memeriksa hak review pengajuan izin (menghindari data clump).
   */
  async canReviewLeave(
    reviewer: { id?: string; role: Role | string; positionId?: string | null },
    leave: {
      stage: string;
      user: {
        role: Role | string;
        positionId?: string | null;
        jobPosition?: { divisionId?: string | null } | null;
      };
    },
  ): Promise<boolean> {
    return this.canReview({
      reviewer,
      target: {
        requesterRole: leave.user.role,
        requesterDivisionId: leave.user.jobPosition?.divisionId ?? null,
        requesterPositionId: leave.user.positionId,
        stage: leave.stage,
      },
    });
  },

  /**
   * Helper ringkas untuk memeriksa hak review pengajuan lembur (menghindari data clump).
   */
  async canReviewOvertime(
    reviewer: { id?: string; role: Role | string; positionId?: string | null },
    overtime: {
      stage: string;
      user: {
        role: Role | string;
        positionId?: string | null;
        jobPosition?: { divisionId?: string | null } | null;
      };
    },
  ): Promise<boolean> {
    return this.canReview({
      reviewer,
      target: {
        requesterRole: overtime.user.role,
        requesterDivisionId: overtime.user.jobPosition?.divisionId ?? null,
        requesterPositionId: overtime.user.positionId,
        stage: overtime.stage,
      },
    });
  },

  /**
   * Cek apakah reviewer berhak memutuskan absen luar radius. Tahap diturunkan
   * dari Role pemilik (`resolveAttendanceReviewerRole`), lalu modul routing
   * memutuskan — termasuk Manager yang mengambil tahap SUPERVISOR milik Divisi
   * tanpa Supervisor Divisi aktif. ADMIN boleh memutuskan absensi siapa pun;
   * tidak ada yang boleh memutuskan absensinya sendiri.
   */
  async canReviewAttendance(
    reviewer: { id: string; role: Role; positionId?: string | null },
    attendance: {
      user: {
        id: string;
        role: Role;
        positionId?: string | null;
        jobPosition?: { divisionId?: string | null } | null;
      };
    },
  ): Promise<boolean> {
    const owner = attendance.user;

    if (reviewer.id === owner.id) return false;
    if (reviewer.role === Role.ADMIN) return true;

    const stage = resolveAttendanceReviewerRole(owner.role);
    if (!stage) return false;

    return this.canReview({
      reviewer,
      target: {
        requesterRole: owner.role,
        // Tanpa `jobPosition` di-include, biarkan `canReview` membaca Divisi
        // dari `positionId` — jangan anggap pemilik tanpa Jabatan.
        requesterDivisionId:
          owner.jobPosition === undefined
            ? undefined
            : (owner.jobPosition?.divisionId ?? null),
        requesterPositionId: owner.positionId,
        stage,
      },
    });
  },

  /**
   * Cek apakah viewer boleh melihat detail suatu pengajuan di halaman desktop.
   */
  async canView(
    viewer: {
      role: Role | string;
      positionId?: string | null;
    },
    requester: {
      positionId?: string | null;
      jobPosition?: { divisionId?: string | null } | null;
    },
  ): Promise<boolean> {
    const [viewerDivisionId, requesterDivisionId] = await Promise.all([
      this.getUserDivisionId(viewer),
      requester.jobPosition?.divisionId !== undefined
        ? requester.jobPosition?.divisionId
        : requester.positionId
          ? this.getUserDivisionId({ positionId: requester.positionId })
          : null,
    ]);

    return canViewRequest({
      viewer: { role: viewer.role, divisionId: viewerDivisionId },
      requesterDivisionId,
    });
  },
};
