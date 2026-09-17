import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { createWorkHistory } from "@/app/action/employee-profile.action";

/** Tambah satu riwayat pekerjaan baru sendiri — JSON body sesuai WorkHistorySchema. */
export async function POST(request: Request) {
  const auth = await requireApiUser();

  if (!auth.user) return auth.response;

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const result = await createWorkHistory(body);

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
