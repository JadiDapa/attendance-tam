/**
 * Modul aturan routing pengajuan per Divisi (ADR 0002). Bebas Prisma:
 * satu-satunya tempat keputusan "siapa melihat/memutuskan Pengajuan ini".
 *
 * Aturan:
 * - SUPERVISOR stage, reviewer Supervisor Divisi D → pemohon Divisi D atau
 *   pemohon tanpa Jabatan.
 * - SUPERVISOR stage, reviewer Supervisor tanpa Jabatan → semua.
 * - SUPERVISOR stage, reviewer Manager → hanya pemohon yang Divisinya tidak
 *   punya Supervisor Divisi aktif.
 * - MANAGER stage → semua Manager (tidak berubah).
 * - Stage awal per Role pemohon tidak berubah.
 */

export type ApprovalRole = "EMPLOYEE" | "ADMIN" | "SUPERVISOR" | "MANAGER";

export type ApprovalScope =
  | { kind: "none" }
  | { kind: "all"; stage: "SUPERVISOR" }
  | { kind: "division"; divisionId: string; stage: "SUPERVISOR" }
  | { kind: "manager"; orphanDivisionIds: string[] };

export type RoutingReviewer = {
  role: ApprovalRole | string;
  divisionId?: string | null;
};

export type RoutingTarget = {
  requesterRole?: ApprovalRole | string;
  requesterDivisionId?: string | null;
  stage: string;
};

/**
 * Himpunan id Divisi yang memiliki Supervisor Divisi aktif.
 * Supervisor Divisi = user aktif ber-Role SUPERVISOR yang memiliki Jabatan di Divisi tersebut.
 */
export function resolveActiveSupervisorDivisionIds(
  users: Array<{
    role: ApprovalRole | string;
    isActive: boolean;
    divisionId?: string | null;
  }>,
): Set<string> {
  const result = new Set<string>();
  for (const user of users) {
    if (
      user.isActive &&
      user.role === "SUPERVISOR" &&
      user.divisionId
    ) {
      result.add(user.divisionId);
    }
  }
  return result;
}

/**
 * Menghitung cakupan antrean pengajuan yang berhak ditinjau oleh seorang reviewer.
 */
export function getApprovalScope(input: {
  reviewer: RoutingReviewer;
  allDivisionIds: readonly string[];
  activeSupervisorDivisionIds: ReadonlySet<string> | readonly string[];
}): ApprovalScope {
  const { reviewer, allDivisionIds } = input;
  const activeDivisions =
    input.activeSupervisorDivisionIds instanceof Set
      ? input.activeSupervisorDivisionIds
      : new Set(input.activeSupervisorDivisionIds);

  if (reviewer.role === "SUPERVISOR") {
    if (!reviewer.divisionId) {
      return { kind: "all", stage: "SUPERVISOR" };
    }
    return {
      kind: "division",
      divisionId: reviewer.divisionId,
      stage: "SUPERVISOR",
    };
  }

  if (reviewer.role === "MANAGER") {
    const orphanDivisionIds = allDivisionIds.filter(
      (id) => !activeDivisions.has(id),
    );
    return {
      kind: "manager",
      orphanDivisionIds,
    };
  }

  return { kind: "none" };
}

/**
 * Menentukan apakah seorang reviewer berhak melihat dan memutuskan pengajuan tertentu.
 */
export function canReviewRequest(input: {
  reviewer: RoutingReviewer;
  target: RoutingTarget;
  activeSupervisorDivisionIds: ReadonlySet<string> | readonly string[];
}): boolean {
  const { reviewer, target } = input;
  const activeDivisions =
    input.activeSupervisorDivisionIds instanceof Set
      ? input.activeSupervisorDivisionIds
      : new Set(input.activeSupervisorDivisionIds);

  const stage = target.stage;

  if (reviewer.role === "SUPERVISOR") {
    if (stage !== "SUPERVISOR") return false;

    // Supervisor tanpa Jabatan dapat meninjau semua pengajuan di tahap SUPERVISOR
    if (!reviewer.divisionId) return true;

    // Pemohon tanpa Jabatan terlihat & dapat diputuskan oleh semua Supervisor
    if (!target.requesterDivisionId) return true;

    // Supervisor Divisi D meninjau pemohon di Divisi D
    return target.requesterDivisionId === reviewer.divisionId;
  }

  if (reviewer.role === "MANAGER") {
    // MANAGER stage: semua Manager
    if (stage === "MANAGER") return true;

    // SUPERVISOR stage: hanya pemohon yang Divisinya tidak punya Supervisor Divisi aktif
    if (stage === "SUPERVISOR") {
      if (!target.requesterDivisionId) {
        // Pemohon tanpa Jabatan ditangani Supervisor, bukan naik ke Manager
        return false;
      }
      return !activeDivisions.has(target.requesterDivisionId);
    }

    return false;
  }

  return false;
}

/**
 * Menentukan apakah sebuah pengajuan adalah giliran reviewer saat ini untuk meninjau,
 * berdasarkan cakupan antrean (ApprovalScope) reviewer tersebut.
 */
export function isTurnToReview(input: {
  scope: ApprovalScope;
  target: {
    status: string;
    stage: string;
    requesterDivisionId?: string | null;
  };
}): boolean {
  if (input.target.status !== "PENDING") return false;

  switch (input.scope.kind) {
    case "none":
      return false;
    case "all":
      return input.target.stage === "SUPERVISOR";
    case "division":
      if (input.target.stage !== "SUPERVISOR") return false;
      if (!input.target.requesterDivisionId) return true;
      return input.target.requesterDivisionId === input.scope.divisionId;
    case "manager":
      if (input.target.stage === "MANAGER") return true;
      if (input.target.stage === "SUPERVISOR") {
        return Boolean(
          input.target.requesterDivisionId &&
            input.scope.orphanDivisionIds.includes(
              input.target.requesterDivisionId,
            ),
        );
      }
      return false;
  }
}

/**
 * Menentukan apakah seorang viewer berhak melihat data pengajuan di desktop
 * (termasuk riwayat yang sudah selesai).
 */
export function canViewRequest(input: {
  viewer: RoutingReviewer;
  requesterDivisionId?: string | null;
}): boolean {
  if (input.viewer.role === "MANAGER") return true;
  if (input.viewer.role === "SUPERVISOR") {
    if (!input.viewer.divisionId) return true;
    if (!input.requesterDivisionId) return true;
    return input.viewer.divisionId === input.requesterDivisionId;
  }
  return false;
}
