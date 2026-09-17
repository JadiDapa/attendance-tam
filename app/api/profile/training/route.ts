import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { createTraining } from "@/app/action/employee-profile.action";

/** Tambah satu pelatihan baru sendiri — JSON body sesuai TrainingSchema. */
export async function POST(request: Request) {
  const auth = await requireApiUser();

  if (!auth.user) return auth.response;

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const result = await createTraining(body);

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
