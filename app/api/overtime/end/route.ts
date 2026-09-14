import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { endOvertime } from "@/app/action/overtime.action";

/**
 * Selesaikan sesi lembur yang sedang berjalan milik user yang login — selalu
 * satu sesi terbuka sekaligus, jadi tidak perlu id di path. JSON body
 * opsional: { endTime?: "HH:mm" } — kosong berarti "sekarang".
 */
export async function PATCH(request: Request) {
  const auth = await requireApiUser();

  if (!auth.user) return auth.response;

  const body = await request.json().catch(() => ({}));
  const result = await endOvertime(body ?? {});

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
