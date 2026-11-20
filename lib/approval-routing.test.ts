import { describe, expect, it } from "vitest";
import {
  canReviewRequest,
  canViewRequest,
  getApprovalScope,
  isTurnToReview,
  resolveActiveSupervisorDivisionIds,
} from "./approval-routing";

const DIV_ADMIN = "div-admin";
const DIV_TEKNIS = "div-teknis";
const DIV_MARKETING = "div-marketing";

describe("Routing Pengajuan per Divisi (lib/approval-routing)", () => {
  const activeDivisions = [DIV_ADMIN, DIV_TEKNIS];

  it("1. Divisi sama → terlihat", () => {
    const reviewer = { role: "SUPERVISOR", divisionId: DIV_TEKNIS };
    const target = {
      requesterRole: "EMPLOYEE",
      requesterDivisionId: DIV_TEKNIS,
      stage: "SUPERVISOR",
    };

    expect(
      canReviewRequest({
        reviewer,
        target,
        activeSupervisorDivisionIds: activeDivisions,
      }),
    ).toBe(true);
  });

  it("2. Divisi lain → tidak", () => {
    const reviewer = { role: "SUPERVISOR", divisionId: DIV_ADMIN };
    const target = {
      requesterRole: "EMPLOYEE",
      requesterDivisionId: DIV_TEKNIS,
      stage: "SUPERVISOR",
    };

    expect(
      canReviewRequest({
        reviewer,
        target,
        activeSupervisorDivisionIds: activeDivisions,
      }),
    ).toBe(false);
  });

  it("3. pemohon tanpa Jabatan → semua Supervisor", () => {
    const spvAdmin = { role: "SUPERVISOR", divisionId: DIV_ADMIN };
    const spvTeknis = { role: "SUPERVISOR", divisionId: DIV_TEKNIS };
    const unassignedTarget = {
      requesterRole: "EMPLOYEE",
      requesterDivisionId: null,
      stage: "SUPERVISOR",
    };

    expect(
      canReviewRequest({
        reviewer: spvAdmin,
        target: unassignedTarget,
        activeSupervisorDivisionIds: activeDivisions,
      }),
    ).toBe(true);
    expect(
      canReviewRequest({
        reviewer: spvTeknis,
        target: unassignedTarget,
        activeSupervisorDivisionIds: activeDivisions,
      }),
    ).toBe(true);
  });

  it("4. Supervisor tanpa Jabatan → semua", () => {
    const spvTanpaJabatan = { role: "SUPERVISOR", divisionId: null };

    expect(
      canReviewRequest({
        reviewer: spvTanpaJabatan,
        target: {
          requesterRole: "EMPLOYEE",
          requesterDivisionId: DIV_TEKNIS,
          stage: "SUPERVISOR",
        },
        activeSupervisorDivisionIds: activeDivisions,
      }),
    ).toBe(true);

    expect(
      canReviewRequest({
        reviewer: spvTanpaJabatan,
        target: {
          requesterRole: "EMPLOYEE",
          requesterDivisionId: DIV_ADMIN,
          stage: "SUPERVISOR",
        },
        activeSupervisorDivisionIds: activeDivisions,
      }),
    ).toBe(true);

    expect(
      canReviewRequest({
        reviewer: spvTanpaJabatan,
        target: {
          requesterRole: "EMPLOYEE",
          requesterDivisionId: null,
          stage: "SUPERVISOR",
        },
        activeSupervisorDivisionIds: activeDivisions,
      }),
    ).toBe(true);
  });

  it("5. Divisi tanpa Supervisor aktif → Manager ya, Supervisor lain tidak", () => {
    const manager = { role: "MANAGER", divisionId: null };
    const spvAdmin = { role: "SUPERVISOR", divisionId: DIV_ADMIN };
    const spvTeknis = { role: "SUPERVISOR", divisionId: DIV_TEKNIS };

    const marketingTarget = {
      requesterRole: "EMPLOYEE",
      requesterDivisionId: DIV_MARKETING,
      stage: "SUPERVISOR",
    };

    // DIV_MARKETING tidak ada di activeDivisions
    expect(
      canReviewRequest({
        reviewer: manager,
        target: marketingTarget,
        activeSupervisorDivisionIds: activeDivisions,
      }),
    ).toBe(true);

    expect(
      canReviewRequest({
        reviewer: spvAdmin,
        target: marketingTarget,
        activeSupervisorDivisionIds: activeDivisions,
      }),
    ).toBe(false);

    expect(
      canReviewRequest({
        reviewer: spvTeknis,
        target: marketingTarget,
        activeSupervisorDivisionIds: activeDivisions,
      }),
    ).toBe(false);
  });

  it("6. Supervisor nonaktif tidak dihitung sebagai Supervisor Divisi", () => {
    const supervisors = [
      { role: "SUPERVISOR", isActive: true, divisionId: DIV_ADMIN },
      { role: "SUPERVISOR", isActive: false, divisionId: DIV_TEKNIS },
      { role: "EMPLOYEE", isActive: true, divisionId: DIV_TEKNIS },
    ];

    const activeSet = resolveActiveSupervisorDivisionIds(supervisors);
    expect(activeSet.has(DIV_ADMIN)).toBe(true);
    expect(activeSet.has(DIV_TEKNIS)).toBe(false);

    // Karena Teknis tidak punya supervisor aktif, pengajuannya naik ke Manager
    const manager = { role: "MANAGER", divisionId: null };
    const spvAdmin = { role: "SUPERVISOR", divisionId: DIV_ADMIN };
    const teknisTarget = {
      requesterRole: "EMPLOYEE",
      requesterDivisionId: DIV_TEKNIS,
      stage: "SUPERVISOR",
    };

    expect(
      canReviewRequest({
        reviewer: manager,
        target: teknisTarget,
        activeSupervisorDivisionIds: activeSet,
      }),
    ).toBe(true);

    expect(
      canReviewRequest({
        reviewer: spvAdmin,
        target: teknisTarget,
        activeSupervisorDivisionIds: activeSet,
      }),
    ).toBe(false);
  });

  it("7. pemohon Supervisor → tahap Manager", () => {
    const manager = { role: "MANAGER", divisionId: null };
    const spvTeknis = { role: "SUPERVISOR", divisionId: DIV_TEKNIS };

    const spvAdminTarget = {
      requesterRole: "SUPERVISOR",
      requesterDivisionId: DIV_ADMIN,
      stage: "MANAGER",
    };

    expect(
      canReviewRequest({
        reviewer: manager,
        target: spvAdminTarget,
        activeSupervisorDivisionIds: activeDivisions,
      }),
    ).toBe(true);

    expect(
      canReviewRequest({
        reviewer: spvTeknis,
        target: spvAdminTarget,
        activeSupervisorDivisionIds: activeDivisions,
      }),
    ).toBe(false);
  });
});

describe("Cakupan Antrean Reviewer (getApprovalScope)", () => {
  const allDivisions = [DIV_ADMIN, DIV_TEKNIS, DIV_MARKETING];
  const activeDivisions = new Set([DIV_ADMIN, DIV_TEKNIS]);

  it("Supervisor Divisi mendapat scope divisi", () => {
    const scope = getApprovalScope({
      reviewer: { role: "SUPERVISOR", divisionId: DIV_ADMIN },
      allDivisionIds: allDivisions,
      activeSupervisorDivisionIds: activeDivisions,
    });

    expect(scope).toEqual({
      kind: "division",
      divisionId: DIV_ADMIN,
      stage: "SUPERVISOR",
    });
  });

  it("Supervisor tanpa Jabatan mendapat scope all", () => {
    const scope = getApprovalScope({
      reviewer: { role: "SUPERVISOR", divisionId: null },
      allDivisionIds: allDivisions,
      activeSupervisorDivisionIds: activeDivisions,
    });

    expect(scope).toEqual({
      kind: "all",
      stage: "SUPERVISOR",
    });
  });

  it("Manager mendapat scope manager beserta orphanDivisionIds", () => {
    const scope = getApprovalScope({
      reviewer: { role: "MANAGER", divisionId: null },
      allDivisionIds: allDivisions,
      activeSupervisorDivisionIds: activeDivisions,
    });

    expect(scope).toEqual({
      kind: "manager",
      orphanDivisionIds: [DIV_MARKETING],
    });
  });

  it("Role selain Supervisor/Manager tidak punya cakupan review", () => {
    const scope = getApprovalScope({
      reviewer: { role: "EMPLOYEE", divisionId: DIV_ADMIN },
      allDivisionIds: allDivisions,
      activeSupervisorDivisionIds: activeDivisions,
    });

    expect(scope).toEqual({ kind: "none" });
  });

  it("Kriteria 2: Supervisor Admin tidak bisa menyetujui izin Teknisi (ditolak)", () => {
    const spvAdmin = { role: "SUPERVISOR", divisionId: DIV_ADMIN };
    const teknisiLeave = {
      requesterRole: "EMPLOYEE",
      requesterDivisionId: DIV_TEKNIS,
      stage: "SUPERVISOR",
    };

    expect(
      canReviewRequest({
        reviewer: spvAdmin,
        target: teknisiLeave,
        activeSupervisorDivisionIds: activeDivisions,
      }),
    ).toBe(false);
  });

  it("Kriteria 4: Tanpa satu pun Jabatan terisi, perilaku identik dengan sebelum fitur ini", () => {
    // Tidak ada jabatan: tidak ada supervisor divisi aktif
    const emptyActiveSupervisors: string[] = [];
    const emptyDivisions: string[] = [];

    // Reviewer supervisor tanpa jabatan
    const spvTanpaJabatan = { role: "SUPERVISOR", divisionId: null };
    const manager = { role: "MANAGER", divisionId: null };

    // Pemohon tanpa jabatan
    const pemohonTanpaJabatan = {
      requesterRole: "EMPLOYEE",
      requesterDivisionId: null,
      stage: "SUPERVISOR",
    };
    const pemohonSpvTanpaJabatan = {
      requesterRole: "SUPERVISOR",
      requesterDivisionId: null,
      stage: "MANAGER",
    };

    // Supervisor melihat semua di tahap SUPERVISOR
    expect(
      canReviewRequest({
        reviewer: spvTanpaJabatan,
        target: pemohonTanpaJabatan,
        activeSupervisorDivisionIds: emptyActiveSupervisors,
      }),
    ).toBe(true);

    // Supervisor tidak bisa review tahap MANAGER
    expect(
      canReviewRequest({
        reviewer: spvTanpaJabatan,
        target: pemohonSpvTanpaJabatan,
        activeSupervisorDivisionIds: emptyActiveSupervisors,
      }),
    ).toBe(false);

    // Manager melihat semua di tahap MANAGER
    expect(
      canReviewRequest({
        reviewer: manager,
        target: pemohonSpvTanpaJabatan,
        activeSupervisorDivisionIds: emptyActiveSupervisors,
      }),
    ).toBe(true);

    // Scope antrean supervisor mencakup semua di SUPERVISOR stage
    const spvScope = getApprovalScope({
      reviewer: spvTanpaJabatan,
      allDivisionIds: emptyDivisions,
      activeSupervisorDivisionIds: emptyActiveSupervisors,
    });
    expect(spvScope).toEqual({ kind: "all", stage: "SUPERVISOR" });

    // Scope antrean manager mencakup MANAGER stage (tanpa orphan division)
    const managerScope = getApprovalScope({
      reviewer: manager,
      allDivisionIds: emptyDivisions,
      activeSupervisorDivisionIds: emptyActiveSupervisors,
    });
    expect(managerScope).toEqual({ kind: "manager", orphanDivisionIds: [] });
  });

  describe("isTurnToReview", () => {
    it("bukan turn jika status bukan PENDING", () => {
      const scope = { kind: "all" as const, stage: "SUPERVISOR" as const };
      expect(
        isTurnToReview({
          scope,
          target: { status: "APPROVED", stage: "SUPERVISOR" },
        }),
      ).toBe(false);
    });

    it("scope manager bernilai true untuk MANAGER stage dan SUPERVISOR stage divisi yatim", () => {
      const scope = {
        kind: "manager" as const,
        orphanDivisionIds: [DIV_MARKETING],
      };
      expect(
        isTurnToReview({
          scope,
          target: { status: "PENDING", stage: "MANAGER" },
        }),
      ).toBe(true);
      expect(
        isTurnToReview({
          scope,
          target: {
            status: "PENDING",
            stage: "SUPERVISOR",
            requesterDivisionId: DIV_MARKETING,
          },
        }),
      ).toBe(true);
      expect(
        isTurnToReview({
          scope,
          target: {
            status: "PENDING",
            stage: "SUPERVISOR",
            requesterDivisionId: DIV_TEKNIS,
          },
        }),
      ).toBe(false);
    });
  });

  describe("canViewRequest", () => {
    it("manager boleh melihat pengajuan dari divisi mana pun", () => {
      expect(
        canViewRequest({
          viewer: { role: "MANAGER", divisionId: null },
          requesterDivisionId: DIV_TEKNIS,
        }),
      ).toBe(true);
    });

    it("supervisor divisi hanya boleh melihat anggota divisinya atau tanpa divisi", () => {
      expect(
        canViewRequest({
          viewer: { role: "SUPERVISOR", divisionId: DIV_ADMIN },
          requesterDivisionId: DIV_ADMIN,
        }),
      ).toBe(true);
      expect(
        canViewRequest({
          viewer: { role: "SUPERVISOR", divisionId: DIV_ADMIN },
          requesterDivisionId: null,
        }),
      ).toBe(true);
      expect(
        canViewRequest({
          viewer: { role: "SUPERVISOR", divisionId: DIV_ADMIN },
          requesterDivisionId: DIV_TEKNIS,
        }),
      ).toBe(false);
    });
  });
});
