import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma";
import { requireApiRole } from "@/lib/api-auth";
import { createManualAttendance } from "@/app/action/attendance.action";

/**
 * Admin menambahkan absen masuk/pulang untuk pengguna yang lupa absen — JSON
 * body: { userId, workDate: "YYYY-MM-DD", type, time: "HH:mm", workMode,
 * reviewNote }. Barisnya ditandai "Ditambahkan admin".
 */
export async function POST(request: Request) {
  const auth = await requireApiRole(Role.ADMIN);

  if (!auth.user) return auth.response;

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const result = await createManualAttendance(body);

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
