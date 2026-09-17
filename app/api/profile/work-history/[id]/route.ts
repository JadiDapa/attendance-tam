import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import {
  deleteWorkHistory,
  updateWorkHistory,
} from "@/app/action/employee-profile.action";

type Params = { params: Promise<{ id: string }> };

/** Ubah satu riwayat pekerjaan milik sendiri — JSON body sesuai WorkHistorySchema. */
export async function PUT(request: Request, { params }: Params) {
  const auth = await requireApiUser();

  if (!auth.user) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const result = await updateWorkHistory(id, body);

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

/** Hapus satu riwayat pekerjaan milik sendiri. */
export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireApiUser();

  if (!auth.user) return auth.response;

  const { id } = await params;
  const result = await deleteWorkHistory(id);

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
