import { NextResponse } from "next/server";
import { ApprovalLogType, Role } from "@/generated/prisma";
import { requireApiAnyRole } from "@/lib/api-auth";
import { ApprovalLogService } from "@/servers/services/approval-log.service";

const TYPES = new Set(Object.values(ApprovalLogType));

/**
 * Riwayat keputusan approval milik reviewer yang login (izin/lembur/dinas
 * luar), dipakai tab "Riwayat" di halaman Review mobile. Query `type`
 * opsional untuk filter pill (LEAVE/OVERTIME/FIELD_ASSIGNMENT).
 */
export async function GET(request: Request) {
  const auth = await requireApiAnyRole([
    Role.ADMIN,
    Role.SUPERVISOR,
    Role.MANAGER,
  ]);

  if (!auth.user) return auth.response;

  const { searchParams } = new URL(request.url);
  const typeParam = searchParams.get("type");

  if (typeParam && !TYPES.has(typeParam as ApprovalLogType)) {
    return NextResponse.json(
      { error: "Parameter 'type' tidak valid" },
      { status: 400 },
    );
  }

  const items = await ApprovalLogService.listForReviewer(
    auth.user.id,
    (typeParam as ApprovalLogType | null) ?? undefined,
  );

  return NextResponse.json({ items });
}
