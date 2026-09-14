import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { upsertEmploymentData } from "@/app/action/employee-profile.action";

/** Simpan data kepegawaian sendiri — JSON body sesuai EmploymentDataSchema. */
export async function PUT(request: Request) {
  const auth = await requireApiUser();

  if (!auth.user) return auth.response;

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const result = await upsertEmploymentData(body);

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
