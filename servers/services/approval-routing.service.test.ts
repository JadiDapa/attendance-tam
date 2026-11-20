import { describe, expect, it } from "vitest";
import {
  AttendanceApproval,
  LeaveStage,
  LeaveStatus,
  OvertimeStage,
} from "@/generated/prisma";
import type { ApprovalScope } from "@/lib/approval-routing";
import {
  buildLeaveWhereForScope,
  buildLeaveWhereForViewer,
  buildOvertimeWhereForScope,
  buildOvertimeWhereForViewer,
} from "./approval-routing.service";

describe("ApprovalRoutingService filter builders", () => {
  const DIV_ADMIN = "div-admin";
  const ORPHAN_DIVS = ["div-marketing", "div-sales"];

  describe("buildLeaveWhereForScope", () => {
    it("scope none menghasilkan filter kosong/tidak ada data", () => {
      const where = buildLeaveWhereForScope({ kind: "none" });
      expect(where).toEqual({ id: "__none__" });
    });

    it("scope all (supervisor tanpa jabatan) menghasilkan status PENDING dan stage SUPERVISOR", () => {
      const where = buildLeaveWhereForScope({ kind: "all", stage: "SUPERVISOR" });
      expect(where).toEqual({
        status: LeaveStatus.PENDING,
        stage: LeaveStage.SUPERVISOR,
      });
    });

    it("scope division menghasilkan status PENDING, stage SUPERVISOR, dan OR pemohon divisi/tanpa jabatan", () => {
      const scope: ApprovalScope = {
        kind: "division",
        divisionId: DIV_ADMIN,
        stage: "SUPERVISOR",
      };
      const where = buildLeaveWhereForScope(scope);
      expect(where).toEqual({
        status: LeaveStatus.PENDING,
        stage: LeaveStage.SUPERVISOR,
        OR: [
          { user: { jobPosition: { divisionId: DIV_ADMIN } } },
          { user: { positionId: null } },
        ],
      });
    });

    it("scope manager tanpa orphan division hanya mencakup stage MANAGER", () => {
      const scope: ApprovalScope = {
        kind: "manager",
        orphanDivisionIds: [],
      };
      const where = buildLeaveWhereForScope(scope);
      expect(where).toEqual({
        status: LeaveStatus.PENDING,
        stage: LeaveStage.MANAGER,
      });
    });

    it("scope manager dengan orphan division mencakup stage MANAGER atau stage SUPERVISOR untuk divisi yatim", () => {
      const scope: ApprovalScope = {
        kind: "manager",
        orphanDivisionIds: ORPHAN_DIVS,
      };
      const where = buildLeaveWhereForScope(scope);
      expect(where).toEqual({
        status: LeaveStatus.PENDING,
        OR: [
          { stage: LeaveStage.MANAGER },
          {
            stage: LeaveStage.SUPERVISOR,
            user: { jobPosition: { divisionId: { in: ORPHAN_DIVS } } },
          },
        ],
      });
    });
  });

  describe("buildOvertimeWhereForScope", () => {
    it("scope division menghasilkan status PENDING, stage SUPERVISOR, dan OR pemohon divisi/tanpa jabatan", () => {
      const scope: ApprovalScope = {
        kind: "division",
        divisionId: DIV_ADMIN,
        stage: "SUPERVISOR",
      };
      const where = buildOvertimeWhereForScope(scope);
      expect(where).toEqual({
        status: AttendanceApproval.PENDING,
        stage: OvertimeStage.SUPERVISOR,
        OR: [
          { user: { jobPosition: { divisionId: DIV_ADMIN } } },
          { user: { positionId: null } },
        ],
      });
    });

    it("scope manager dengan orphan division mencakup stage MANAGER atau stage SUPERVISOR untuk divisi yatim", () => {
      const scope: ApprovalScope = {
        kind: "manager",
        orphanDivisionIds: ORPHAN_DIVS,
      };
      const where = buildOvertimeWhereForScope(scope);
      expect(where).toEqual({
        status: AttendanceApproval.PENDING,
        OR: [
          { stage: OvertimeStage.MANAGER },
          {
            stage: OvertimeStage.SUPERVISOR,
            user: { jobPosition: { divisionId: { in: ORPHAN_DIVS } } },
          },
        ],
      });
    });
  });

  describe("buildWhereForViewer", () => {
    it("supervisor dengan divisi hanya melihat anggota divisinya atau yang tanpa jabatan", () => {
      const where = buildLeaveWhereForViewer({ divisionId: DIV_ADMIN });
      expect(where).toEqual({
        OR: [
          { user: { jobPosition: { divisionId: DIV_ADMIN } } },
          { user: { positionId: null } },
        ],
      });
    });

    it("supervisor tanpa jabatan melihat semua", () => {
      const where = buildLeaveWhereForViewer({ divisionId: null });
      expect(where).toEqual({});
    });

    it("overtime viewer mengikuti aturan yang sama", () => {
      const where = buildOvertimeWhereForViewer({ divisionId: DIV_ADMIN });
      expect(where).toEqual({
        OR: [
          { user: { jobPosition: { divisionId: DIV_ADMIN } } },
          { user: { positionId: null } },
        ],
      });
    });
  });
});
