import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { startOvertime } from "@/app/action/overtime.action";
import { OvertimeService } from "@/servers/services/overtime.service";

/** Mulai lembur — JSON body: { startTime: "HH:mm", reason }. */
export async function POST(request: Request) {
  const auth = await requireApiUser();

  if (!auth.user) return auth.response;

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const result = await startOvertime(body);

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}

/** Riwayat lembur sendiri, terbaru dulu. */
export async function GET() {
  const auth = await requireApiUser();

  if (!auth.user) return auth.response;

  const items = await OvertimeService.list({ userId: auth.user.id });

  return NextResponse.json({ items });
}
